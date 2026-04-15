import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
};

export type WorkspaceDraft = {
  id: string;
  title?: string;
  abstract?: string;
  authors?: string[];
  updatedAt: string;
};

type SessionState = {
  isAuthenticated: boolean;
  userProfile: SessionUser | null;
  theme: ThemeMode;
  recentSubmissions: string[];
  drafts: Record<string, WorkspaceDraft>;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setUserProfile: (userProfile: SessionUser | null) => void;
  setTheme: (theme: ThemeMode) => void;
  rememberSubmission: (submissionId: string) => void;
  saveDraft: (draft: WorkspaceDraft) => void;
  clearDraft: (draftId: string) => void;
  clearSession: () => void;
  clearLocalState: () => void;
};

const initialState = {
  isAuthenticated: false,
  userProfile: null,
  theme: "system" as ThemeMode,
  recentSubmissions: [] as string[],
  drafts: {} as Record<string, WorkspaceDraft>,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setUserProfile: (userProfile) => set({ userProfile }),
      setTheme: (theme) => set({ theme }),
      rememberSubmission: (submissionId) =>
        set((state) => ({
          recentSubmissions: [
            submissionId,
            ...state.recentSubmissions.filter((id) => id !== submissionId),
          ].slice(0, 3),
        })),
      saveDraft: (draft) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draft.id]: {
              ...draft,
              updatedAt: draft.updatedAt,
            },
          },
        })),
      clearDraft: (draftId) =>
        set((state) => {
          const nextDrafts = { ...state.drafts };
          delete nextDrafts[draftId];

          return { drafts: nextDrafts };
        }),
      clearSession: () => set(initialState),
      clearLocalState: () => set({ recentSubmissions: [], drafts: {} }),
    }),
    {
      name: "neo-academico-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userProfile: state.userProfile,
        theme: state.theme,
        recentSubmissions: state.recentSubmissions,
        drafts: state.drafts,
      }),
    },
  ),
);
