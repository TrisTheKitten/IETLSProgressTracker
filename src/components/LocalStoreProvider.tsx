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
import type {
  AttemptInput,
  CustomPracticeSetInput,
  GoalsInput,
  PracticeSetDetailsInput,
  PracticeSetEvent,
  TestType,
} from "@/lib/domain";
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
  saveAttempt: (input: AttemptInput) => Promise<string>;
  deleteAttempt: (id: string) => Promise<void>;
  transitionPracticeSetStatus: (id: string, event: PracticeSetEvent) => Promise<void>;
  updatePracticeSetDetails: (id: string, input: PracticeSetDetailsInput) => Promise<void>;
  createCustomPracticeSet: (input: CustomPracticeSetInput) => Promise<string>;
  saveStudyGoals: (goals: GoalsInput) => Promise<void>;
  setDefaultTestType: (value: TestType) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
};

const LocalStoreContext = createContext<LocalStoreValue | null>(null);

export function LocalStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const queueRef = useRef(Promise.resolve());

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

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const apply = useCallback(
    (recipe: (current: AppData) => AppData) =>
      enqueue(async () => {
        const current = dataRef.current;
        if (!current) throw new Error("Local store is not ready");
        const next = recipe(current);
        dataRef.current = next;
        setData(next);
        await saveAppData(next);
      }),
    [enqueue],
  );

  const saveAttempt = useCallback(
    async (input: AttemptInput) => {
      let id = "";
      await apply((current) => {
        const result = mutations.saveAttempt(current, input);
        id = result.id;
        return result.data;
      });
      return id;
    },
    [apply],
  );

  const deleteAttempt = useCallback(
    async (id: string) => {
      await apply((current) => mutations.deleteAttempt(current, id));
    },
    [apply],
  );

  const transitionPracticeSetStatus = useCallback(
    async (id: string, event: PracticeSetEvent) => {
      await apply((current) => mutations.transitionPracticeSetStatus(current, id, event));
    },
    [apply],
  );

  const updatePracticeSetDetails = useCallback(
    async (id: string, input: PracticeSetDetailsInput) => {
      await apply((current) => mutations.updatePracticeSetDetails(current, id, input));
    },
    [apply],
  );

  const createCustomPracticeSet = useCallback(
    async (input: CustomPracticeSetInput) => {
      let id = "";
      await apply((current) => {
        const result = mutations.createCustomPracticeSet(current, input);
        id = result.id;
        return result.data;
      });
      return id;
    },
    [apply],
  );

  const saveStudyGoals = useCallback(
    async (goals: GoalsInput) => {
      await apply((current) => mutations.saveStudyGoals(current, goals));
    },
    [apply],
  );

  const setDefaultTestType = useCallback(
    async (value: TestType) => {
      await apply((current) => mutations.setDefaultTestType(current, value));
    },
    [apply],
  );

  const exportDataFn = useCallback(
    () =>
      enqueue(async () => {
        const current = dataRef.current;
        if (!current) throw new Error("Local store is not ready");
        return mutations.exportData(current);
      }),
    [enqueue],
  );

  const importDataFn = useCallback(
    async (jsonData: string) => {
      await apply(() => mutations.importData(jsonData));
    },
    [apply],
  );

  const resetDatabase = useCallback(async () => {
    await apply(() => mutations.resetDatabase());
  }, [apply]);

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
    setDefaultTestType,
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
