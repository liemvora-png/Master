(() => {
  const authSection = document.querySelector("#admin-auth");
  const authStatus = document.querySelector("#admin-auth-status");
  const signInButton = document.querySelector("#admin-sign-in");
  const editor = document.querySelector("#admin-editor");
  const manager = document.querySelector(".portfolio-admin");

  async function loadClerk() {
    const publishableKey = window.__CLERK_PUBLISHABLE_KEY__;
    if (!publishableKey) throw new Error("Clerk publishable key is not configured.");
    if (!window.Clerk) throw new Error("Clerk failed to load.");
    await window.Clerk.load({ publishableKey });
    return window.Clerk;
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
