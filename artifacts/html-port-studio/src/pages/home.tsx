import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useAnalyzeHtml, 
  useListPoeModels, 
  useChatWithPoe,
  useHealthCheck,
  useCreateReplitProject,
  useGetReplitProjectConnection,
  useGetReplitProjectConnectionSetup,
  useGetReplitProjectStatus,
  useRetryReplitProjectSetup,
} from '@workspace/api-client-react';
import type {
  HtmlAnalysis,
  PortFinding,
  PoeMessage,
  ReplitProjectHandoff,
} from '@workspace/api-client-react';
import { useAuth } from '@workspace/replit-auth-web';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Activity, 
  FileCode, 
  Sparkles, 
  ArrowRight,
  MonitorPlay,
  Terminal,
  Send,
  Loader2,
  ListChecks,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ----------------------------------------------------------------------
// Types and Helpers
// ----------------------------------------------------------------------

const SEVERITY_COLORS = {
  info: 'info',
  warning: 'warning',
  blocker: 'destructive'
} as const;

const SEVERITY_ICONS = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  blocker: <XCircle className="h-4 w-4" />
} as const;

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------

function Header({ onReset }: { onReset: () => void }) {
  const { data: health, isError } = useHealthCheck();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2 font-semibold text-foreground cursor-pointer" onClick={onReset}>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FileCode className="h-4 w-4" />
        </div>
        HTML Port Studio
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {isError ? (
            <><div className="h-2 w-2 rounded-full bg-destructive" /> API Disconnected</>
          ) : health ? (
            <><div className="h-2 w-2 rounded-full bg-green-500" /> API Connected</>
          ) : (
            <><div className="h-2 w-2 rounded-full bg-muted" /> Checking...</>
          )}
        </div>
      </div>
    </header>
  );
}

function PoeAssistantPanel({ html, findings }: { html: string, findings: PortFinding[] }) {
  const { data: poeData, isLoading: modelsLoading } = useListPoeModels();
  const chatMutation = useChatWithPoe();
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<PoeMessage[]>([
    { role: 'assistant', content: "Hello! I can help you port this HTML to Replit. What issue are you facing?" }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (poeData?.models?.length && !selectedModel) {
      setSelectedModel(poeData.models[0]);
    }
  }, [poeData, selectedModel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || !selectedModel || chatMutation.isPending) return;

    const newMessage: PoeMessage = { role: 'user', content: prompt };
    const newHistory = [...chatHistory, newMessage];
    
    setChatHistory(newHistory);
    setPrompt('');

    // Prepend system context quietly
    const systemContext = `You are a helpful coding assistant helping port an HTML app from Poe to Replit.\nHere is the user's current HTML:\n\`\`\`html\n${html.substring(0, 3000)}${html.length > 3000 ? '\n...[truncated]' : ''}\n\`\`\`\nHere are the findings from the port analysis: ${findings.map(f => f.title).join(', ')}`;
    
    chatMutation.mutate({
      data: {
        model: selectedModel,
        messages: [{ role: 'system', content: systemContext }, ...newHistory]
      }
    }, {
      onSuccess: (res) => {
        setChatHistory(prev => [...prev, { role: 'assistant', content: res.content }]);
      },
      onError: () => {
        setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Check the API connection and your Poe setup." }]);
      }
    });
  };

  if (!poeData?.configured && !modelsLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <AlertTriangle className="mb-4 h-8 w-8 text-warning" />
        <p className="mb-2 font-medium">Poe API Not Configured</p>
        <p className="text-sm">The server is missing Poe API credentials. The assistant is disabled.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Poe Assistant
        </div>
        {poeData?.models?.length ? (
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {poeData.models.map(m => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="text-xs">Loading models...</Badge>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {chatHistory.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground font-mono whitespace-pre-wrap'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex items-start">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Poe how to fix a blocker..."
            disabled={chatMutation.isPending || !selectedModel}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!prompt.trim() || chatMutation.isPending || !selectedModel}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function apiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string') return message;
    }
  }
  return 'The Replit project handoff could not be started. Your imported HTML is still here.';
}

function HandoffStepIcon({
  status,
}: {
  status: ReplitProjectHandoff['steps'][number]['status'];
}) {
  if (status === 'completed') {
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  }
  if (status === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
  if (status === 'failed') {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />;
}

function ReplitProjectHandoffPanel({ html }: { html: string }) {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [jobId, setJobId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showConnectionSetup, setShowConnectionSetup] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useCreateReplitProject();
  const retryMutation = useRetryReplitProjectSetup();
  const connectionQuery = useGetReplitProjectConnection({
    query: {
      queryKey: ['replit-project-connection'],
      enabled: isAuthenticated,
      staleTime: 0,
    },
  });
  const connectionSetupQuery = useGetReplitProjectConnectionSetup({
    query: {
      queryKey: ['replit-project-connection-setup'],
      enabled: isAuthenticated && showConnectionSetup,
    },
  });
  const statusQuery = useGetReplitProjectStatus(jobId ?? '', {
    query: {
      queryKey: ['replit-project-status', jobId],
      enabled: Boolean(jobId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === 'completed' || status === 'failed' ? false : 800;
      },
    },
  });

  const handoff = statusQuery.data ?? createMutation.data;
  const isWorking =
    createMutation.isPending ||
    retryMutation.isPending ||
    handoff?.status === 'queued' ||
    handoff?.status === 'running';
  const failedStep = handoff?.steps.find((step) => step.status === 'failed');
  const connectionNeedsSetup =
    isAuthenticated && connectionQuery.data?.status === 'setup_required';

  useEffect(() => {
    if (!showConnectionSetup) return;
    const refreshConnection = () => {
      void connectionQuery.refetch();
    };
    window.addEventListener('focus', refreshConnection);
    return () => window.removeEventListener('focus', refreshConnection);
  }, [showConnectionSetup, connectionQuery.refetch]);

  const handleCreate = () => {
    if (connectionNeedsSetup) {
      setShowConnectionSetup(true);
      return;
    }
    setLocalError(null);
    createMutation.mutate(
      { data: { html } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(['replit-project-status', data.jobId], data);
          setJobId(data.jobId);
        },
        onError: (error) => {
          setLocalError(apiErrorMessage(error));
        },
      },
    );
  };

  const handleCheckConnection = async () => {
    const result = await connectionQuery.refetch();
    if (result.data?.status === 'connected') {
      setShowConnectionSetup(false);
    }
  };

  const handleRetry = () => {
    if (!jobId) return;
    setLocalError(null);
    retryMutation.mutate(
      { jobId },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(['replit-project-status', data.jobId], data);
          setJobId(data.jobId);
          void statusQuery.refetch();
        },
        onError: (error) => {
          setLocalError(apiErrorMessage(error));
        },
      },
    );
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.03] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Create a Replit Project</CardTitle>
            <CardDescription className="mt-1">
              Send this exact HTML into a runnable Replit project and install the
              required setup skills in order.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-2"
            onClick={isAuthenticated ? handleCreate : login}
            disabled={authLoading || connectionQuery.isLoading || Boolean(jobId) || isWorking}
          >
            {authLoading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...</>
            ) : !isAuthenticated ? (
              <><ArrowRight className="h-3.5 w-3.5" /> Log in to create</>
            ) : connectionQuery.isLoading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...</>
            ) : connectionNeedsSetup ? (
              <><ArrowRight className="h-3.5 w-3.5" /> Set up project creation</>
            ) : isWorking ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...</>
            ) : handoff?.status === 'completed' ? (
              <><CheckCircle className="h-3.5 w-3.5" /> Project Created</>
            ) : (
              <><ArrowRight className="h-3.5 w-3.5" /> Create Replit Project</>
            )}
          </Button>
        </div>
      </CardHeader>
      {!authLoading && !isAuthenticated && (
        <CardContent className="pt-0">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Login required</AlertTitle>
            <AlertDescription>
              Log in to create a project and keep its setup status private to your account.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      {isAuthenticated && connectionQuery.isError && (
        <CardContent className="pt-0">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Could not check project creation</AlertTitle>
            <AlertDescription>
              Refresh the page to retry. Your imported HTML is still only in this browser session.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      {connectionNeedsSetup && !showConnectionSetup && (
        <CardContent className="pt-0">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Replit project creation needs setup</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                Connect the authorized Replit project-creation capability before sending this HTML anywhere.
                Replit verifies workspace-owner eligibility during secure setup.
              </p>
              <Button type="button" size="sm" onClick={() => setShowConnectionSetup(true)}>
                Set up project creation
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      {showConnectionSetup && (
        <CardContent className="pt-0">
          <div className="space-y-3 rounded-md border border-primary/20 bg-background p-4">
            <div>
              <p className="font-medium">Set up Replit project creation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Replit checks workspace-owner eligibility before authorizing this server-side connection.
                No credential is shown to the Studio or added to your imported HTML.
              </p>
            </div>
            {connectionQuery.data?.status === 'connected' ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Project creation is connected</AlertTitle>
                <AlertDescription>
                  You can now create a Replit project from this panel.
                </AlertDescription>
              </Alert>
            ) : (
              connectionSetupQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening secure setup…
                </div>
              ) : connectionSetupQuery.data?.setupUrl ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={connectionSetupQuery.data.setupUrl} target="_blank" rel="noreferrer">
                      Open Replit connection setup
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCheckConnection()}
                    disabled={connectionQuery.isFetching}
                  >
                    {connectionQuery.isFetching ? 'Checking…' : 'I connected it — check again'}
                  </Button>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Setup link unavailable</AlertTitle>
                  <AlertDescription>{apiErrorMessage(connectionSetupQuery.error)}</AlertDescription>
                </Alert>
              )
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-fit"
              onClick={() => setShowConnectionSetup(false)}
            >
              Back to project creation
            </Button>
          </div>
        </CardContent>
      )}
      {(localError || statusQuery.isError) && (
        <CardContent className="pt-0">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Project handoff unavailable</AlertTitle>
            <AlertDescription>
              {localError ||
                'The setup status could not be loaded. The imported HTML is still in this session.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      {handoff && (
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {handoff.status === 'completed'
                ? 'All setup skills completed'
                : handoff.currentStep
                  ? `Current step: ${handoff.currentStep}`
                  : 'Preparing project...'}
            </span>
            {handoff.projectId && (
              <span className="font-mono">Project ID: {handoff.projectId}</span>
            )}
          </div>
          <div className="space-y-2">
            {handoff.steps.map((step) => (
              <div
                key={step.name}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <HandoffStepIcon status={step.status} />
                <span className={step.status === 'completed' ? 'text-muted-foreground' : 'font-medium'}>
                  {step.name}
                </span>
                {step.status === 'failed' && (
                  <span className="ml-auto text-xs text-destructive">Failed</span>
                )}
              </div>
            ))}
          </div>
          {handoff.status === 'failed' && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                {failedStep?.error || handoff.error || 'Project creation failed before setup could begin.'}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={isWorking}
              >
                Retry step
              </Button>
            </div>
          )}
          {handoff.status === 'completed' && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm">
              <span>
                <strong>{handoff.projectName}</strong> is ready without an editor or version-control workflow.
              </span>
              {handoff.projectUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a href={handoff.projectUrl} target="_blank" rel="noreferrer">
                    Open project
                  </a>
                </Button>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">{handoff.projectId}</span>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------
// Main Page
// ----------------------------------------------------------------------

export default function Home() {
  const [htmlInput, setHtmlInput] = useState('');
  const [analysisData, setAnalysisData] = useState<HtmlAnalysis | null>(null);
  const analyzeMutation = useAnalyzeHtml();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = () => {
    if (!htmlInput.trim()) return;
    analyzeMutation.mutate({ data: { html: htmlInput } }, {
      onSuccess: (data) => {
        setAnalysisData(data);
      }
    });
  };

  const handleReset = () => {
    setAnalysisData(null);
    setHtmlInput('');
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const html = await file.text();
    setHtmlInput(html);
    setAnalysisData(null);
    event.target.value = '';
  };

  if (!analysisData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onReset={handleReset} />
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-300">
            <Card className="border-border shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Terminal className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Import HTML App</CardTitle>
                <CardDescription className="text-base mt-2">
                  Paste your standalone HTML file from Poe to safely analyze compatibility and preview it in a sandboxed environment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm,text/html"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Choose one standalone file, or paste its source below.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className="h-11 shrink-0 gap-2 border border-purple-500 px-5 text-sm font-semibold"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Choose HTML file
                  </Button>
                </div>
                <Textarea 
                  value={htmlInput}
                  onChange={(e) => setHtmlInput(e.target.value)}
                  placeholder="Paste your HTML code here..."
                  className="min-h-[300px] font-mono text-sm resize-y border border-black bg-muted/30 focus-visible:ring-primary/50"
                />
                
                {analyzeMutation.isError && (
                  <Alert variant="destructive" className="mt-4">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Analysis Failed</AlertTitle>
                    <AlertDescription>
                      Could not analyze the provided HTML. Check your connection or formatting.
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleAnalyze}
                  disabled={!htmlInput.trim() || analyzeMutation.isPending}
                  className="w-full mt-6 h-12 text-base font-medium"
                >
                  {analyzeMutation.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Activity className="mr-2 h-5 w-5" /> Analyze & Preview</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // --- STUDIO VIEW ---
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden animate-in fade-in duration-300">
      <Header onReset={handleReset} />
      
      <main className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          
          {/* Left Panel: Analysis Results */}
          <Panel defaultSize={35} minSize={25} className="border-r bg-card/50">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-8">
                
                {/* Header Stats */}
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground mb-4">
                    {analysisData.title || 'Untitled App'}
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-card shadow-sm border-border">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Size</div>
                        <div className="text-2xl font-bold font-mono">{formatBytes(analysisData.bytes)}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card shadow-sm border-border">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Scripts</div>
                        <div className="text-2xl font-bold font-mono">{analysisData.scriptCount}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card shadow-sm border-border">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Ext. Assets</div>
                        <div className="text-2xl font-bold font-mono">{analysisData.externalAssetCount}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card shadow-sm border-border">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <div className="text-sm font-medium text-muted-foreground mb-1">AI Signals</div>
                        <div className="text-2xl font-bold font-mono text-primary">{analysisData.aiSignalCount}</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Findings */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ListChecks className="h-5 w-5 text-foreground" />
                    <h3 className="text-lg font-semibold">Readiness Findings</h3>
                    <Badge variant="outline" className="ml-auto bg-muted">
                      {analysisData.findings.length}
                    </Badge>
                  </div>

                  {analysisData.findings.length === 0 ? (
                     <Alert className="bg-primary/5 border-primary/20 !text-black">
                      <CheckCircle className="h-4 w-4 !text-primary" />
                       <AlertTitle className="!text-black">All Clear</AlertTitle>
                       <AlertDescription className="!text-black">No issues found. Ready to port!</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {analysisData.findings.map((finding, idx) => (
                        <Alert key={idx} variant={SEVERITY_COLORS[finding.severity]} className="!text-black">
                          {SEVERITY_ICONS[finding.severity]}
                          <AlertTitle className="capitalize font-semibold !text-black">{finding.title}</AlertTitle>
                          <AlertDescription className="mt-2 space-y-2 !text-black">
                            <p>{finding.detail}</p>
                            {finding.action && (
                              <div className="text-xs font-mono bg-background/50 p-2 rounded border border-inherit/10 !text-black">
                                <span className="font-semibold uppercase mr-2">Action:</span>
                                {finding.action}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>

                <ReplitProjectHandoffPanel html={htmlInput} />

                {/* Steps */}
                {analysisData.steps.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Porting Checklist</h3>
                    <div className="space-y-2">
                      {analysisData.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 text-sm p-3 rounded-lg border bg-card">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {idx + 1}
                          </div>
                          <p className="text-muted-foreground leading-tight pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

          {/* Right Panel: Preview & Chat */}
          <Panel defaultSize={65}>
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="preview" className="gap-2">
                    <MonitorPlay className="h-4 w-4" />
                    Safe Preview
                  </TabsTrigger>
                  <TabsTrigger value="assistant" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Poe Assistant
                  </TabsTrigger>
                </TabsList>
                <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={handleReset}>
                  <ArrowRight className="h-3 w-3" /> Start Over
                </Button>
              </div>

              <div className="flex-1 overflow-hidden relative bg-muted/20">
                <TabsContent value="preview" className="m-0 h-full w-full absolute inset-0 p-4">
                  <div className="h-full w-full rounded-xl overflow-hidden border shadow-sm bg-white">
                    <iframe 
                      srcDoc={htmlInput}
                       sandbox="allow-scripts allow-forms"
                      className="w-full h-full border-0"
                      title="Preview"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="assistant" className="m-0 h-full w-full absolute inset-0 border-l border-r border-b">
                  <PoeAssistantPanel html={htmlInput} findings={analysisData.findings} />
                </TabsContent>
              </div>
            </Tabs>
          </Panel>
          
        </PanelGroup>
      </main>
    </div>
  );
}
