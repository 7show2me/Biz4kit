import { Button, buttonVariants } from "@Biz4kit/ui/components/button";
import { Link } from "@tanstack/react-router";

// Sign in (screen "login", D94): Biz4Kit brand in full, Google is the only sign-in,
// invite code as the fallback. Wording is the locked prototype's.
export function SignInView({
  onGoogle,
  pending = false,
  googleEnabled = true,
}: {
  googleEnabled?: boolean;
  onGoogle: () => void;
  pending?: boolean;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-6 py-10 text-center">
      <img
        alt="Biz4Kit"
        className="h-8 w-auto dark:hidden"
        src="/brand/biz4kit-lockup.svg"
      />
      <img
        alt="Biz4Kit"
        className="hidden h-8 w-auto dark:block"
        src="/brand/biz4kit-lockup-white.svg"
      />
      <h1 className="text-heading tab:text-display-lg mt-10 font-serif font-bold">
        Reply, book, invoice, get paid.
      </h1>
      <p className="text-title text-muted-foreground tab:text-heading mt-1 font-serif">
        Under your own name.
      </p>
      <div className="mt-8 flex w-full max-w-80 flex-col gap-2">
        <Button
          disabled={pending || !googleEnabled}
          onClick={onGoogle}
          size="lg"
          variant="outline"
        >
          Continue with Google
        </Button>
        {googleEnabled ? null : (
          <p className="text-caption text-muted-foreground">
            Google sign-in is not set up on this server yet.
          </p>
        )}
        <Link className={buttonVariants({ variant: "ghost" })} to="/invite">
          I have an invite code
        </Link>
        <Link className={buttonVariants({ variant: "ghost" })} to="/new">
          Start a new business
        </Link>
      </div>
      <p className="text-caption text-muted-foreground mt-10 max-w-80">
        By continuing you agree to the Biz4Kit terms and privacy notice.{" "}
        <span className="italic">[Draft, lawyer to finalise]</span>
      </p>
    </div>
  );
}
