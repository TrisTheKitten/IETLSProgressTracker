"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createInitialAppData,
  ensureCambridgeCatalogueUpToDate,
  loadAppData,
  mutations,
  saveAppData,
  type AppData,
} from "@/lib/local-store";

type LocalStoreValue = {
  data: AppData;
  ready: boolean;
  error: string | null;
  saveAttempt: (input: unknown) => Promise<{ success: true; id: string }>;
  deleteAttempt: (input: unknown) => Promise<{ success: true }>;
  transitionPracticeSetStatus: (
    idInput: unknown,
    eventInput: unknown,
  ) => Promise<{ success: true }>;
  updatePracticeSetDetails: (
    idInput: unknown,
    input: unknown,
  ) => Promise<{ success: true }>;
  createCustomPracticeSet: (input: unknown) => Promise<{ success: true; id: string }>;
  saveStudyGoals: (input: unknown) => Promise<{ success: true }>;
  updateAppSetting: (keyInput: unknown, valueInput: unknown) => Promise<{ success: true }>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<{ success: boolean; error?: string }>;
  resetDatabase: () => Promise<{ success: true }>;
};

const LocalStoreContext = createContext<LocalStoreValue | null>(null);

export function LocalStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<AppData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const stored = await loadAppData();
        const next = stored
          ? ensureCambridgeCatalogueUpToDate(stored)
          : createInitialAppData();

        if (stored == null || next !== stored) {
          await saveAppData(next);
        }

        if (!cancelled) {
          dataRef.current = next;
          setData(next);
          setReady(true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load local data");
          setReady(true);
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(async (next: AppData) => {
    dataRef.current = next;
    setData(next);
    await saveAppData(next);
  }, []);

  const requireData = useCallback(() => {
    const current = dataRef.current;
    if (!current) throw new Error("Local store is not ready");
    return current;
  }, []);

  const saveAttempt = useCallback(async (input: unknown) => {
    const result = mutations.saveAttempt(requireData(), input);
    await commit(result.data);
    return { success: true as const, id: result.id };
  }, [commit, requireData]);

  const deleteAttempt = useCallback(async (input: unknown) => {
    await commit(mutations.deleteAttempt(requireData(), input));
    return { success: true as const };
  }, [commit, requireData]);

  const transitionPracticeSetStatus = useCallback(async (idInput: unknown, eventInput: unknown) => {
    await commit(mutations.transitionPracticeSetStatus(requireData(), idInput, eventInput));
    return { success: true as const };
  }, [commit, requireData]);

  const updatePracticeSetDetails = useCallback(async (idInput: unknown, input: unknown) => {
    await commit(mutations.updatePracticeSetDetails(requireData(), idInput, input));
    return { success: true as const };
  }, [commit, requireData]);

  const createCustomPracticeSet = useCallback(async (input: unknown) => {
    const result = mutations.createCustomPracticeSet(requireData(), input);
    await commit(result.data);
    return { success: true as const, id: result.id };
  }, [commit, requireData]);

  const saveStudyGoals = useCallback(async (input: unknown) => {
    await commit(mutations.saveStudyGoals(requireData(), input));
    return { success: true as const };
  }, [commit, requireData]);

  const updateAppSetting = useCallback(async (keyInput: unknown, valueInput: unknown) => {
    await commit(mutations.updateAppSetting(requireData(), keyInput, valueInput));
    return { success: true as const };
  }, [commit, requireData]);

  const exportDataFn = useCallback(async () => mutations.exportData(requireData()), [requireData]);

  const importDataFn = useCallback(async (jsonData: string) => {
    const result = mutations.importData(jsonData);
    if (!result.success) return result;
    await commit(result.data);
    return { success: true };
  }, [commit]);

  const resetDatabase = useCallback(async () => {
    await commit(mutations.resetDatabase());
    return { success: true as const };
  }, [commit]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Could not open local storage
        </h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground">
          Check that IndexedDB is available in this browser, then reload the page.
        </p>
      </div>
    );
  }

  if (!ready || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading your local study data…
      </div>
    );
  }

  const value: LocalStoreValue = {
    data,
    ready,
    error,
    saveAttempt,
    deleteAttempt,
    transitionPracticeSetStatus,
    updatePracticeSetDetails,
    createCustomPracticeSet,
    saveStudyGoals,
    updateAppSetting,
    exportData: exportDataFn,
    importData: importDataFn,
    resetDatabase,
  };

  return (
    <LocalStoreContext.Provider value={value}>
      {children}
    </LocalStoreContext.Provider>
  );
}

export function useLocalStore(): LocalStoreValue {
  const value = useContext(LocalStoreContext);
  if (!value) {
    throw new Error("useLocalStore must be used within LocalStoreProvider");
  }
  return value;
}
