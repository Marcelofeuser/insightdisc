import React, { createContext, useContext } from 'react';
import { PANEL_MODE, PANEL_MODE_ORDER, resolveAutoPanelMode } from '@/modules/navigation/panelMode';
import { isSuperAdminAccess } from '@/modules/auth/access-control';

const defaultContext = {
  panelMode: PANEL_MODE.BUSINESS,
  autoPanelMode: PANEL_MODE.BUSINESS,
  availableModes: PANEL_MODE_ORDER,
  canManuallySwitchModes: false,
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
  const canManuallySwitchModes = isSuperAdminAccess(access);
  const effectivePanelMode = canManuallySwitchModes ? (panelMode || autoPanelMode) : autoPanelMode;
  const availableModes = canManuallySwitchModes ? PANEL_MODE_ORDER : [autoPanelMode];

  const safeSetPanelMode = canManuallySwitchModes
    ? (setPanelMode || (() => {}))
    : () => {};

  return {
    panelMode: effectivePanelMode,
    autoPanelMode,
    setPanelMode: safeSetPanelMode,
    availableModes,
    canManuallySwitchModes,
  };
}
