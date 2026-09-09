import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth as useClerkAuth,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export type StudioUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type StudioAuthState = {
  user: StudioUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const configuredPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkPubKey = configuredPublishableKey
  ? publishableKeyFromHost(window.location.hostname, configuredPublishableKey)
  : "";
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const e2eAuthEnabled =
  import.meta.env.DEV && import.meta.env.VITE_STUDIO_E2E_AUTH === "true";

const AuthContext = createContext<StudioAuthState>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: clerkPubKey
    ? null
    : "Sign-in is unavailable until Clerk is configured for this app.",
  login: () => undefined,
  logout: () => undefined,
});

const fallbackAuthState: StudioAuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: "Sign-in is unavailable until Clerk is configured for this app.",
  login: () => undefined,
  logout: () => undefined,
};

const e2eAuthState: StudioAuthState = {
  user: {
    id: "e2e-user",
    email: "e2e@example.test",
    firstName: "Browser",
    lastName: "Test",
    profileImageUrl: null,
  },
  isLoading: false,
  isAuthenticated: true,
  error: null,
  login: () => undefined,
  logout: () => undefined,
};

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const login = useCallback(() => {
    setLocation("/sign-in");
  }, [setLocation]);

  const logout = useCallback(() => {
    window.dispatchEvent(new Event("studio-auth:logout"));
    void signOut({ redirectUrl: basePath || "/" });
  }, [signOut]);

  const clerkUserId = clerkUser?.id ?? null;
  const clerkUserEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
  const clerkUserFirstName = clerkUser?.firstName ?? null;
  const clerkUserLastName = clerkUser?.lastName ?? null;
  const clerkUserImageUrl = clerkUser?.imageUrl ?? null;
  const isAuthenticated = Boolean(isSignedIn);

  const user = useMemo<StudioUser | null>(
    () =>
      clerkUserId
        ? {
            id: clerkUserId,
            email: clerkUserEmail,
            firstName: clerkUserFirstName,
            lastName: clerkUserLastName,
            profileImageUrl: clerkUserImageUrl,
          }
        : null,
    [
      clerkUserEmail,
      clerkUserFirstName,
      clerkUserId,
      clerkUserImageUrl,
      clerkUserLastName,
    ],
  );

  const authContextValue = useMemo(
    () => ({
      user,
      isLoading: !isLoaded,
      isAuthenticated,
      error: null,
      login,
      logout,
    }),
    [isAuthenticated, isLoaded, login, logout, user],
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      <ClerkQueryClientCacheInvalidator />
      {children}
    </AuthContext.Provider>
  );
}

export function useStudioAuth(): StudioAuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!clerkPubKey) {
    if (e2eAuthEnabled) {
      return (
        <AuthContext.Provider value={e2eAuthState}>
          {children}
        </AuthContext.Provider>
      );
    }
    return <AuthContext.Provider value={fallbackAuthState}>{children}</AuthContext.Provider>;
  }
  return <ConfiguredAuthProvider>{children}</ConfiguredAuthProvider>;
}

function ConfiguredAuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const appearance = {
    theme: shadcn,
    cssLayerName: "clerk",
    options: {
      logoPlacement: "inside" as const,
      logoLinkUrl: basePath || "/",
      logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    },
    variables: {
      colorPrimary: "hsl(243 75% 59%)",
      colorForeground: "hsl(222 47% 11%)",
      colorMutedForeground: "hsl(222 20% 35%)",
      colorDanger: "hsl(0 84% 45%)",
      colorBackground: "hsl(0 0% 100%)",
      colorInput: "hsl(0 0% 100%)",
      colorInputForeground: "hsl(222 47% 11%)",
      colorNeutral: "hsl(214 32% 91%)",
      fontFamily: "Plus Jakarta Sans, sans-serif",
      borderRadius: "0.75rem",
    },
    elements: {
      rootBox: "w-full flex justify-center",
      cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden",
      card: "!shadow-none !border-0 !bg-transparent !rounded-none",
      footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
      headerTitle: "text-foreground",
      headerSubtitle: "text-muted-foreground",
      socialButtonsBlockButtonText: "text-foreground",
      formFieldLabel: "text-foreground",
      footerActionLink: "text-primary",
      footerActionText: "text-muted-foreground",
      dividerText: "text-muted-foreground",
      identityPreviewEditButton: "text-primary",
      formFieldSuccessText: "text-green-700",
      alertText: "text-destructive",
      logoBox: "h-10",
      logoImage: "max-h-10",
      socialButtonsBlockButton: "border-input bg-background",
      formButtonPrimary: "bg-primary text-primary-foreground",
      formFieldInput: "border-input bg-background text-foreground",
      footerAction: "text-muted-foreground",
      dividerLine: "bg-border",
      alert: "border-destructive/30 bg-destructive/5",
      otpCodeFieldInput: "border-input bg-background text-foreground",
      formFieldRow: "text-foreground",
      main: "bg-background",
    },
  };

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to continue porting your HTML",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Keep project handoffs private to your account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}

export function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <ClerkSignIn />
    </div>
  );
}

export function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <ClerkSignUp />
    </div>
  );
}

function ClerkSignIn() {
  return (
    <SignIn
      routing="path"
      path={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      fallbackRedirectUrl={basePath || "/"}
    />
  );
}

function ClerkSignUp() {
  return (
    <SignUp
      routing="path"
      path={`${basePath}/sign-up`}
      signInUrl={`${basePath}/sign-in`}
      fallbackRedirectUrl={basePath || "/"}
    />
  );
}