"""Linux-only supervision of code-owned STATIC AUTHORING fixtures, not host safety.

No arbitrary caller authority, ports, application cleanup or remote supervision.
One fixture at a time in a dedicated Python process; subreaper adoption covers
the inspected fixture descendants even when they create another session.
This cooperative /proc incarnation check is not adversarial pidfd containment.
"""
import ctypes
import math
import os
import selectors
import signal
import subprocess
import sys
import time


def execution_on_time(completed, observed_at, deadline):
    return completed is True and observed_at < deadline


class BoundedCapture:
    """Keep at most max_bytes TOTAL, including stderr, while collecting."""
    def __init__(self, process, max_bytes):
        if type(max_bytes) is not int or max_bytes <= 0:
            raise ValueError("positive integer output bound required")
        self.process = process
        self.limit = max_bytes
        self.buffers = {process.stdout: bytearray(), process.stderr: bytearray()}
        self.kept = 0
        self.overflow = False
        self.selector = selectors.DefaultSelector()
        try:
            for stream in (process.stdout, process.stderr):
                os.set_blocking(stream.fileno(), False)
                self.selector.register(stream, selectors.EVENT_READ)
        except BaseException:
            self.close()
            raise

    def drain_until(self, deadline):
        while True:
            now = time.monotonic()
            if now >= deadline:
                return False
            if not self.selector.get_map() and self.process.poll() is not None:
                return execution_on_time(True, time.monotonic(), deadline)
            for key, _ in self.selector.select(min(0.01, deadline - now)):
                try:
                    chunk = os.read(key.fileobj.fileno(), 8192)
                except BlockingIOError:
                    continue
                if not chunk:
                    self.selector.unregister(key.fileobj)
                    continue
                remaining = self.limit - self.kept
                piece = chunk[:remaining]
                self.buffers[key.fileobj].extend(piece)
                self.kept += len(piece)
                if len(chunk) > remaining:
                    self.overflow = True
                    return False
            if not self.selector.get_map():
                time.sleep(min(0.005, max(0, deadline - time.monotonic())))

    @property
    def data(self):
        # Keep stream frames intact; interleaving stderr progress into stdout JSON
        # would corrupt otherwise valid telemetry. Total retained bytes is capped.
        return b"".join(self.buffers.values())

    @property
    def output(self):
        return self.data.decode("utf-8", errors="replace")

    def close(self):
        self.selector.close()
        for stream in (self.process.stdout, self.process.stderr):
            if stream is not None:
                stream.close()


def process_rows():
    rows = {}
    for name in os.listdir("/proc"):
        if not name.isdigit():
            continue
        try:
            root = "/proc/" + name
            if os.stat(root).st_uid != os.getuid():
                continue
            with open(root + "/stat") as source:
                text = source.read(8192)
            fields = text[text.rindex(")") + 2:].split()
            rows[int(name)] = (fields[19], int(fields[1]), fields[0])
        except FileNotFoundError:
            continue
    return rows


def prepare_static_fixture():
    if sys.platform != "linux":
        raise RuntimeError("owned fixture supervisor requires Linux /proc + subreaper")
    # Process-local setting, not a system service or application configuration.
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(36, 1, 0, 0, 0) != 0:  # PR_SET_CHILD_SUBREAPER
        raise OSError(ctypes.get_errno(), "cannot enable authoring subreaper")
    return {(pid, row[0]) for pid, row in process_rows().items()
            if row[1] == os.getpid()}


class FixtureTree:
    def __init__(self, process, existing_children):
        self.root = process.pid
        self.existing = existing_children
        self.identities = set()
        self.delivered = set()
        self.signals = []
        self.gap = False
        rows = process_rows()
        if self.root not in rows or rows[self.root][1] != os.getpid():
            raise RuntimeError("new fixture root identity unavailable")
        self.identities.add((self.root, rows[self.root][0]))
        self.observe()

    def observe(self):
        try:
            rows = process_rows()
        except (OSError, ValueError, IndexError):
            self.gap = True
            return []
        # The dedicated, single-flight authoring process launches no unrelated
        # children; adopted new children are from its inspected static fixture.
        for pid, row in rows.items():
            if row[1] == os.getpid() and (pid, row[0]) not in self.existing:
                self.identities.add((pid, row[0]))
        changed = True
        while changed:
            changed = False
            parents = {pid for pid, start in self.identities
                       if pid in rows and rows[pid][0] == start}
            for pid, row in rows.items():
                identity = (pid, row[0])
                if row[1] in parents and identity not in self.identities:
                    self.identities.add(identity)
                    changed = True
        return [identity for identity in self.identities
                if identity[0] in rows and rows[identity[0]][0] == identity[1]
                and rows[identity[0]][2] not in ("Z", "X")]

    def signal_live(self, signum):
        for identity in self.observe():
            key = (identity, signum)
            if key in self.delivered:
                continue
            if identity in self.observe() and identity[0] != os.getpid():
                try:
                    os.kill(identity[0], signum)
                    self.delivered.add(key)
                    self.signals.append((identity, signum.name))
                except ProcessLookupError:
                    pass
                except OSError:
                    self.gap = True

    def stop(self, grace, verification):
        grace_end = time.monotonic() + grace
        end = grace_end + verification
        while time.monotonic() < end:
            if not self.observe():
                break
            self.signal_live(signal.SIGTERM if time.monotonic() < grace_end
                             else signal.SIGKILL)
            time.sleep(0.01)
        stopped = not self.observe() and not self.gap
        # Reap adopted dead children, not the Popen-owned root.
        for pid, _ in self.identities:
            if pid != self.root:
                try:
                    os.waitpid(pid, os.WNOHANG)
                except ChildProcessError:
                    pass
        return stopped


_active = False
_unresolved_lifecycle = False


def supervise_static(argv, execution=0.9, grace=0.2, verification=1.0,
                     capture=0.5, max_bytes=65536, on_spawn=None):
    """Only for reviewed fixture commands; never a generic host runner."""
    global _active, _unresolved_lifecycle
    if _active or _unresolved_lifecycle:
        raise RuntimeError("authoring fixture active/unknown lifecycle retains exclusion")
    for value in (execution, grace, verification, capture):
        if type(value) not in (int, float) or not math.isfinite(value) or value <= 0:
            raise ValueError("finite positive authoring phase budgets required")
    if type(max_bytes) is not int or max_bytes <= 0:
        raise ValueError("positive integer capture bound required")
    existing = prepare_static_fixture()
    _active = True
    process = tree = reader = None
    started = time.monotonic()
    execution_end = started + execution
    expired = False
    surviving_work = False
    error = None
    stopped = False
    capture_complete = False
    observed_execution = None
    try:
        process = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   start_new_session=True)
        tree = FixtureTree(process, existing)
        reader = BoundedCapture(process, max_bytes)
        if on_spawn is not None:
            on_spawn(process)  # synthetic journal hook; cleanup ignores its health
        completed = False
        while time.monotonic() < execution_end:
            tree.observe()
            if reader.drain_until(min(execution_end, time.monotonic() + 0.02)):
                completed = True
                break
            if reader.overflow:
                break
        observed_execution = time.monotonic()
        expired = not execution_on_time(completed, observed_execution, execution_end)
        if completed and tree.observe():
            surviving_work = True  # not a fabricated deadline breach
        if reader.overflow and observed_execution < execution_end:
            expired = False  # overflow is a separate non-success reason
    except BaseException as exc:
        error = type(exc).__name__ + ": " + str(exc)
    finally:
        try:
            if tree is not None:
                stopped = tree.stop(grace, verification)
            if reader is not None:
                capture_complete = reader.drain_until(time.monotonic() + capture)
            if process is not None:
                process.poll()  # never an unbounded wait
        except BaseException as exc:
            error = error or type(exc).__name__ + ": " + str(exc)
        finally:
            output = reader.output if reader is not None else ""
            overflow = reader.overflow if reader is not None else False
            kept = len(reader.data) if reader is not None else 0
            if reader is not None:
                reader.close()
            elif process is not None:
                for stream in (process.stdout, process.stderr):
                    if stream is not None:
                        stream.close()
            _active = False
    raw = process.returncode if process is not None else None
    if process is not None and not stopped:
        _unresolved_lifecycle = True  # no automatic replacement or age-unlock
    incomplete = not stopped or not capture_complete or error is not None
    return dict(raw_exit=raw, deadline=expired, surviving_work=surviving_work,
                elapsed=time.monotonic() - started,
                execution_elapsed=observed_execution - started
                if observed_execution is not None else None,
                output=output, output_bytes_kept=kept, output_overflow=overflow,
                error=error, known_stopped=stopped, exclusion=incomplete,
                capture_complete=capture_complete,
                output_order="stdout_then_stderr",
                pass_=(not incomplete and not expired and not surviving_work
                       and not overflow and raw == 0),
                signals=tree.signals if tree is not None else [],
                outer_ms=round(execution * 1000), grace_ms=round(grace * 1000),
                verification_ms=round(verification * 1000),
                capture_ms=round(capture * 1000),
                scope="owned static authoring fixture tree; no host readiness")