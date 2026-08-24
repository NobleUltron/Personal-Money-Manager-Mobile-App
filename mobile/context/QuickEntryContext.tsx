import React, { createContext, useContext, useState, useCallback } from 'react';

interface QuickEntryContextValue {
  isOpen: boolean;
  openQuickEntry: () => void;
  closeQuickEntry: () => void;
}

const QuickEntryContext = createContext<QuickEntryContextValue>({
  isOpen: false,
  openQuickEntry: () => {},
  closeQuickEntry: () => {},
});

export const QuickEntryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openQuickEntry = useCallback(() => setIsOpen(true), []);
  const closeQuickEntry = useCallback(() => setIsOpen(false), []);

  return (
    <QuickEntryContext.Provider value={{ isOpen, openQuickEntry, closeQuickEntry }}>
      {children}
    </QuickEntryContext.Provider>
  );
};

export const useQuickEntry = () => useContext(QuickEntryContext);
