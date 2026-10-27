(() => {
  const authSection = document.querySelector("#admin-auth");
  const authStatus = document.querySelector("#admin-auth-status");
  const signInButton = document.querySelector("#admin-sign-in");
  const editor = document.querySelector("#admin-editor");
  const manager = document.querySelector(".portfolio-admin");
  const DEFAULT_CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsubGllbXZvcmEuY2Mk";
  const clerkScript = document.querySelector('script[src*="/npm/@clerk/clerk-js@"]');

  function waitForClerk() {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + 10000;
      const check = () => {
        if (window.Clerk) return resolve(window.Clerk);
        if (Date.now() >= deadline) return reject(new Error("Clerk failed to load."));
        window.setTimeout(check, 50);
      };
      check();
    });
  }

  async function loadClerk() {
    const publishableKey = clerkScript?.dataset.clerkPublishableKey || DEFAULT_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey) throw new Error("Clerk publishable key is not configured.");
    const clerk = await waitForClerk();
    await clerk.load({
      publishableKey,
      ui: { ClerkUI: window.__internal_ClerkUICtor }
    });
    return clerk;
  }

  const ready = loadClerk().then((clerk) => {
    if (!clerk.user) {
      authStatus.textContent = "Sign in to manage private site content.";
      signInButton.hidden = false;
      signInButton.addEventListener("click", () => clerk.openSignIn({
        fallbackRedirectUrl: "/admin"
      }));
      editor.hidden = true;
      manager.hidden = true;
      return null;
    }

    authSection.hidden = true;
    editor.hidden = false;
    manager.hidden = false;
    clerk.mountUserButton(document.querySelector("#clerk-user-button"), {
      afterSignOutUrl: "/"
    });
    return clerk;
  }).catch((error) => {
    authStatus.textContent = error.message;
    signInButton.hidden = true;
    editor.hidden = true;
    manager.hidden = true;
    throw error;
  });

  window.adminAuth = {
    ready,
    async fetch(input, options = {}) {
      const clerk = await ready;
      if (!clerk?.session) throw new Error("Sign in is required to use the admin editor.");
      const token = await clerk.session.getToken();
      if (!token) throw new Error("Unable to create a Clerk session token.");
      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...options, headers });
    }
  };
})();
