/**
 * Scripted product demo that plays inside the page, so it runs in any browser (iOS Simulator
 * Safari included) without remote automation. It types and taps at a human pace, shows a ripple
 * on every tap and full-screen title cards between scenes, and forces each outcome through the
 * `mock_scenario` cookie, so every take is identical.
 *
 * Loaded only when the server is started with DEMO_PLAYER=enabled (see `make demo-server`), and
 * started only by `#demo` in the URL (on load, or when the hash changes to it). Hash options: `speed=1.5` (slower pauses) and
 * `done=<port>` (pinged on localhost when the demo ends, so a recorder can stop).
 */
(() => {
  if (window.__demoPlayer) return;
  window.__demoPlayer = { started: false, done: false, error: null };

  const run = (options) => {
    const SPEED = Number(options.get("speed")) || 1;
    const DONE_PORT = options.get("done");

    // The demo always starts in the light theme: a dark choice from a previous take is reset.
    if (localStorage.getItem("mw-theme") === "dark") {
      localStorage.setItem("mw-theme", "light");
      location.reload();
      return;
    }

    // ── Timing and lookups ──
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms * SPEED));
    const until = async (find, what, timeoutMs = 20000) => {
      const start = Date.now();
      for (;;) {
        const element = find();
        if (element) return element;
        if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };
    const textOf = (element) => (element?.textContent ?? "").replace(/\s+/g, " ").trim();
    const all = (selector) => [...document.querySelectorAll(selector)];
    const button = (name) => () => all("button").find((b) => textOf(b) === name && !b.disabled);
    const link = (name) => () => all("a").find((a) => textOf(a) === name);
    const field = (label) => () => {
      const match = all("label").find((l) => textOf(l) === label);
      return match ? document.getElementById(match.htmlFor) : null;
    };
    /** The visible label of a radio option, which selects it when tapped. */
    const option = (name) => () =>
      all("label").find((l) => l.querySelector('input[type="radio"]') && textOf(l).includes(name));
    const heading = (name) => () => all("h1, h2").find((h) => textOf(h) === name);
    const onPath = (path) => () => location.pathname === path;

    // ── Visuals ──
    const style = document.createElement("style");
    style.textContent = `
    .demo-ripple { position: fixed; z-index: 2147483646; width: 44px; height: 44px;
      margin: -22px 0 0 -22px; border-radius: 50%; pointer-events: none;
      background: rgba(84, 88, 198, 0.35); animation: demo-ripple 520ms ease-out forwards; }
    @keyframes demo-ripple { from { transform: scale(0.4); opacity: 1; }
      to { transform: scale(1.6); opacity: 0; } }
    .demo-card { position: fixed; inset: 0; z-index: 2147483647; display: grid;
      place-content: center; gap: 14px; padding: 32px; text-align: center; background: #0b0b10;
      opacity: 0; transition: opacity 600ms ease;
      font-family: -apple-system, "SF Pro Display", system-ui, sans-serif; }
    .demo-card.is-visible { opacity: 1; }
    .demo-card h1 { margin: 0; font-size: 40px; line-height: 1.1; font-weight: 800;
      letter-spacing: -0.03em; color: transparent; -webkit-background-clip: text;
      background-clip: text; transform: translateY(14px);
      background-image: linear-gradient(100deg, #8b8ff0 0%, #5458c6 45%, #f86500 100%);
      transition: transform 900ms cubic-bezier(0.2, 0.8, 0.2, 1); }
    .demo-card.is-visible h1 { transform: none; }
    .demo-card p { margin: 0; font-size: 18px; line-height: 1.4; color: #c9c9d6; }`;
    document.head.append(style);

    const card = async (title, subtitle, holdMs = 2400) => {
      const overlay = document.createElement("div");
      overlay.className = "demo-card";
      const h = document.createElement("h1");
      h.textContent = title;
      const p = document.createElement("p");
      p.textContent = subtitle;
      overlay.append(h, p);
      document.body.append(overlay);
      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-visible")));
      await wait(holdMs + 600);
      overlay.classList.remove("is-visible");
      await wait(700);
      overlay.remove();
    };

    const ripple = (element) => {
      const box = element.getBoundingClientRect();
      const dot = document.createElement("div");
      dot.className = "demo-ripple";
      dot.style.left = `${box.left + box.width / 2}px`;
      dot.style.top = `${box.top + box.height / 2}px`;
      document.body.append(dot);
      setTimeout(() => dot.remove(), 600);
    };

    // ── Gestures ──
    const tap = async (find, what) => {
      const element = await until(find, what);
      element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      await wait(250);
      ripple(element);
      await wait(220);
      element.click();
    };

    /** Radix menus open on `pointerdown`, not on `click`. */
    const press = async (find, what) => {
      const element = await until(find, what);
      ripple(element);
      await wait(220);
      element.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }),
      );
    };

    /** Types like a person; the native setter keeps React's change tracking in sync. */
    const type = async (find, what, text) => {
      const input = await until(find, what);
      await tap(() => input, what);
      input.focus();
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      for (const character of text) {
        setValue.call(input, input.value + character);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await wait(110);
      }
      // Dismisses the form toolbar that iOS Safari shows while a field is focused.
      await wait(300);
      input.blur();
    };

    const forceOutcome = (scenario) => {
      document.cookie = `mock_scenario=${scenario}; path=/`;
    };

    /** Amount → recipient → summary, ending on the "Confirmar" button. */
    const prepareTransfer = async (amount, recipient) => {
      await tap(link("Nueva transferencia"), "the new transfer link");
      await until(field("Monto"), "the amount field");
      await wait(700);
      await type(field("Monto"), "the amount field", amount);
      await wait(500);
      await tap(button("Continuar"), "Continuar");
      await until(option(recipient), recipient);
      await wait(900);
      await tap(option(recipient), recipient);
      await wait(500);
      await tap(button("Continuar"), "Continuar");
      await until(button("Confirmar"), "Confirmar");
      await wait(1600);
    };

    const play = async () => {
      // A session left by a previous take is closed first.
      if (location.pathname === "/home") {
        await tap(button("Salir"), "Salir");
        await until(onPath("/login"), "the login page");
      }
      await until(field("Teléfono o correo electrónico"), "the login field");
      await wait(600);

      // 1. Opening, login and Home
      await card("Mini Wallet", "Tu dinero, a un toque de distancia.", 2600);
      await type(field("Teléfono o correo electrónico"), "the login field", "ana@example.com");
      await wait(400);
      await tap(button("Continuar"), "Continuar");
      await until(onPath("/home"), "Home");
      await until(() => document.querySelector("main li"), "the movements");
      await wait(2200);

      // 2. A transfer in three steps
      await card("Tres pasos.", "Monto, destinatario y confirmación.");
      await prepareTransfer("250", "Luis Pérez");
      forceOutcome("SUCCESS");
      await tap(button("Confirmar"), "Confirmar");
      await until(heading("¡Transferencia exitosa!"), "the voucher");
      await wait(2800);

      // 3. Failures explain what to do next
      await tap(link("Volver al inicio"), "Volver al inicio");
      await until(onPath("/home"), "Home");
      await card("Siempre sabes qué pasó.", "Cada error te dice qué hacer después.");
      await prepareTransfer("120", "Marta Ruiz");
      forceOutcome("NETWORK");
      await tap(button("Confirmar"), "Confirmar");
      await until(button("Reintentar"), "Reintentar");
      await wait(2600);
      forceOutcome("SUCCESS");
      await tap(button("Reintentar"), "Reintentar");
      await until(heading("¡Transferencia exitosa!"), "the voucher");
      await wait(2000);

      // 4. Light or dark
      await tap(link("Volver al inicio"), "Volver al inicio");
      await until(onPath("/home"), "Home");
      await until(() => document.querySelector("main li"), "the movements");
      await card("Claro u oscuro.", "Como tú prefieras.", 2000);
      await press(
        () => document.querySelector('button[aria-label="Cambiar tema"]'),
        "the theme menu",
      );
      await wait(600);
      await tap(
        () => all('[role="menuitemradio"]').find((item) => textOf(item) === "Oscuro"),
        "Oscuro",
      );
      await wait(1800);
      window.scrollBy({ top: 400, behavior: "smooth" });
      await wait(1800);

      // 5. Closing
      await card("Mini Wallet", "Inicio · Transferencia · Comprobante", 3200);
    };

    const finish = (error) => {
      document.cookie = "mock_scenario=; path=/; max-age=0";
      window.__demoPlayer.done = true;
      window.__demoPlayer.error = error ? String(error.message ?? error) : null;
      if (error) console.error("[demo]", error);
      if (DONE_PORT) {
        fetch(`http://localhost:${DONE_PORT}/done`, { mode: "no-cors" }).catch(() => {});
      }
    };

    play().then(() => finish(null), finish);
  };

  // The demo starts when the page is opened with `#demo`, or when the hash changes to it: a
  // recorder can then open the page first and start the demo once the recording is running.
  const begin = () => {
    const options = new URLSearchParams(location.hash.slice(1));
    if (!options.has("demo") || window.__demoPlayer.started) return;
    window.__demoPlayer.started = true;
    run(options);
  };
  addEventListener("hashchange", begin);
  if (document.readyState === "complete") begin();
  else addEventListener("load", begin, { once: true });
})();
