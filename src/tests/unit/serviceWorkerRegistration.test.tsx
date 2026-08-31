import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { serviceWorkerStatusEventName } from "@/features/offline/OfflineStatusIndicator";
import { ServiceWorkerRegistration as ServiceWorkerRegistrationComponent } from "@/features/offline/ServiceWorkerRegistration";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("ServiceWorkerRegistration", () => {
  it("announces a waiting update without forcing the active worker to take over", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const registration = new EventTarget() as ServiceWorkerRegistration;
    const postMessage = vi.fn();
    Object.defineProperties(registration, {
      installing: { configurable: true, value: null },
      waiting: { configurable: true, value: Object.assign(new EventTarget(), { postMessage }) }
    });
    const register = vi.fn().mockResolvedValue(registration);
    const serviceWorker = { controller: {}, register };
    Object.defineProperty(window.navigator, "serviceWorker", { configurable: true, value: serviceWorker });
    const listener = vi.fn();
    window.addEventListener(serviceWorkerStatusEventName, listener);

    const view = render(<ServiceWorkerRegistrationComponent />);

    await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" }));
    await waitFor(() => expect(listener).toHaveBeenCalledOnce());
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toBe("update-ready");
    expect(postMessage).not.toHaveBeenCalled();

    view.unmount();
    window.removeEventListener(serviceWorkerStatusEventName, listener);
  });
});
