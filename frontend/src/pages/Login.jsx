import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import LiquidWarp from "@/components/ui/background/LiquidWarp";
import DarkModeToggle from "@/components/DarkModeToggle";
import Logo from "@/components/Logo";
import PasswordInput from "@/components/PasswordInput";
import { Github } from "lucide-react";
import { Google } from "@boxicons/react";
import { useAuth } from "../hooks/useAuth.js";
import { authApi } from "../api/auth.api.js";
import useToast from "../hooks/useToast.js";

export default function Login() {
  const { login } = useAuth();
  const { register, handleSubmit, getValues } = useForm();
  const navigate = useNavigate();
  const toast = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const onSubmit = async (data) => {
    try {
      const result = isSignUp
        ? await authApi.register(data.name, data.email, data.password)
        : await authApi.login(data.email, data.password);

      login(result.user, result.token);
      navigate("/home");
    } catch (err) {
      console.error(err);
      toast.error("Login Failed");
    }
  };

  // Backend redirects to /login?error=... if the OAuth flow fails
  useEffect(() => {
    if (searchParams.get("error")) {
      toast.error("Login Failed");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // Sends a reset link to whatever is in the email field
  const handleForgotPassword = async () => {
    const email = getValues("email")?.trim();
    if (!email) {
      toast.error("Enter your email address first");
      return;
    }
    try {
      await authApi.forgotPassword(email);
      toast.success("If that email exists, a reset link has been sent");
    } catch (err) {
      console.error(err);
      toast.error("Could not send reset link");
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = authApi.oauthUrl(provider);
  };

  const handleDemoLogin = async (email, password) => {
    try {
      const result = await authApi.login(email, password);
      login(result.user, result.token);
      navigate("/home");
    } catch (err) {
      console.error(err);
      toast.error("Demo login failed");
    }
  };

  return (
    <div className="font-body grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      <div className="relative hidden lg:block">
        <LiquidWarp
          speed={0.003}
          warpIntensity={1.5}
          warpFrequency={10}
          iterations={10}
          colorSpeed={0.1}
          colorOffsetR={0}
          colorOffsetG={2}
          colorOffsetB={4}
          brightness={0.5}
          saturation={0.5}
          zoom={1}
        />
      </div>
      <div className="relative min-h-screen flex flex-col font-body items-center justify-center bg-background-muted px-4 py-10">
        <Logo />
        <div className="absolute right-2 top-2">
          <DarkModeToggle />
        </div>
        <div className="text-xl sm:text-2xl mt-10 sm:mt-15 font-semibold p-2 text-foreground text-center">
          {isSignUp ? "Create your account" : "Welcome Back"}
        </div>
        <div className="pb-8 text-sm sm:text-md text-foreground-muted text-center px-4">
          {isSignUp
            ? "Get Started with a free account"
            : "Enter your email to sign in to your account"}
        </div>

        <div className="bg-background p-6 sm:p-8 rounded-xl text-foreground shadow-sm border border-border-muted w-full max-w-110">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <button
              className="cursor-pointer bg-background shadow-sm hover:shadow-md border border-border-muted hover:border-border/60 rounded-md p-2 flex justify-center items-center gap-2 sm:gap-4 hover:bg-background-highlight text-sm sm:text-md"
              onClick={() => handleOAuth("google")}
            >
              <Google />
              Google
            </button>
            <button
              className="cursor-pointer bg-background shadow-sm hover:shadow-md border border-border-muted hover:border-border/90 rounded-md p-2 hover:bg-background-highlight flex justify-center items-center gap-2 sm:gap-4 text-sm sm:text-md"
              onClick={() => handleOAuth("github")}
            >
              <Github size={20} /> Github
            </button>
          </div>

          <div className="my-6 flex items-center">
            <div className="grow border border-border"></div>
            <span className="mx-2 shrink text-xs sm:text-sm text-border whitespace-nowrap">
              OR CONTINUE WITH
            </span>
            <div className="grow border border-border"></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {isSignUp && (
              <div className="mb-4">
                <label className="block mb-2 text-sm">Full Name</label>
                <input
                  {...register("name")}
                  type="text"
                  required
                  className="border rounded-md p-3 w-full bg-background text-base sm:text-md border-border-muted focus:ring-1 focus:ring-border focus:outline-none"
                  placeholder="Maxwell Pandey"
                />
              </div>
            )}
            <div className="mb-4">
              <label className="block mb-2 text-sm">Email address</label>
              <input
                {...register("email")}
                type="email"
                required
                className="border rounded-md p-3 w-full bg-background text-base sm:text-md border-border-muted focus:ring-1 focus:ring-border focus:outline-none"
                placeholder="name@example.com"
              />
            </div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="cursor-pointer text-sm text-primary hover:text-primary-hover"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <PasswordInput
                {...register("password")}
                required
                className="border rounded-md p-3 w-full bg-background text-base sm:text-md border-border-muted focus:ring-1 focus:ring-border focus:outline-none"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              className="cursor-pointer bg-primary shadow-sm hover:bg-primary-hover rounded-md p-2 flex justify-center items-center gap-4 text-primary-foreground font-semibold text-md w-full"
            >
              {isSignUp ? "Sign up" : "Sign in"}
            </button>
          </form>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              className="cursor-pointer bg-background hover:bg-background-muted shadow-sm border border-border-muted hover:border-border/60 rounded-md p-2 flex justify-center items-center gap-4 text-sm sm:text-md w-full mt-4"
              onClick={() => handleDemoLogin("demo@demo.com", "demo@123")}
            >
              Demo Account
            </button>
            <button
              className="cursor-pointer bg-background hover:bg-background-muted shadow-sm border border-border-muted hover:border-border/60 rounded-md p-2 flex justify-center items-center gap-4 text-sm sm:text-md w-full mt-4"
              onClick={() => handleDemoLogin("demo2@demo.com", "demo@123")}
            >
              Demo Account 2
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-foreground-muted text-center">
          {isSignUp ? "Already have an account?  " : "Don't have an account?  "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="cursor-pointer text-primary hover:text-primary-hover"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
