import React, { createContext, useContext } from 'react';
import { PANEL_MODE, PANEL_MODE_ORDER, resolveAutoPanelMode } from '@/modules/navigation/panelMode';
import { isSuperAdminAccess } from '@/modules/auth/access-control';

const defaultContext = {
  panelMode: PANEL_MODE.BUSINESS,
  autoPanelMode: PANEL_MODE.BUSINESS,
  availableModes: PANEL_MODE_ORDER,
  setPanelMode: () => {},
};

const PanelModeContext = createContext(defaultContext);

export function PanelModeProvider({ value, children }) {
  const normalizedValue = value || defaultContext;
  return <PanelModeContext.Provider value={normalizedValue}>{children}</PanelModeContext.Provider>;
}

export function usePanelMode() {
  return useContext(PanelModeContext);
}

export function buildPanelModeContext(access, panelMode, setPanelMode) {
  const autoPanelMode = resolveAutoPanelMode(access);
  const isSuperAdmin = isSuperAdminAccess(access);
  const effectivePanelMode = isSuperAdmin ? panelMode || autoPanelMode : autoPanelMode;
  return {
    panelMode: effectivePanelMode,
    autoPanelMode,
    setPanelMode: isSuperAdmin ? setPanelMode : () => {},
    availableModes: PANEL_MODE_ORDER,
  };
}
