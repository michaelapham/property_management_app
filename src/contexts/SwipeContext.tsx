import { createContext, useContext, useState, type ReactNode } from "react";

interface SwipeContextValue {
  openRowId: string | null;
  setOpenRowId: (id: string | null) => void;
}

const SwipeContext = createContext<SwipeContextValue>({
  openRowId: null,
  setOpenRowId: () => {},
});

export function SwipeProvider({ children }: { children: ReactNode }) {
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  return (
    <SwipeContext.Provider value={{ openRowId, setOpenRowId }}>
      {children}
    </SwipeContext.Provider>
  );
}

export function useSwipeContext() {
  return useContext(SwipeContext);
}
