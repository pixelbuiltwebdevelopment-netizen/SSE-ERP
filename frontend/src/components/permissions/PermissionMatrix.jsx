import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';
import { SCOPES } from '../../utils/constants';

const PermissionMatrix = ({ modules, permissions, onChange }) => {
  const [expandedModules, setExpandedModules] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Get module level permission state
  const getModulePermission = (moduleKey) => {
    return permissions.find(
      (p) => p.module && p.module.toLowerCase() === moduleKey.toLowerCase()
    );
  };

  const isModuleEnabled = (moduleKey) => {
    const modPerm = getModulePermission(moduleKey);
    if (!modPerm || !modPerm.actions) return false;
    return Object.values(modPerm.actions).some((action) => action.allowed);
  };

  const toggleModuleExpansion = (moduleKey) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  // Toggle the entire module ON/OFF
  const handleToggleModule = (mod, isCurrentlyEnabled) => {
    const updated = JSON.parse(JSON.stringify(permissions));
    let modPermIndex = updated.findIndex(
      (p) => p.module && p.module.toLowerCase() === mod.key.toLowerCase()
    );

    if (isCurrentlyEnabled) {
      if (modPermIndex >= 0) {
        Object.keys(updated[modPermIndex].actions).forEach((key) => {
          updated[modPermIndex].actions[key].allowed = false;
        });
      }
    } else {
      if (modPermIndex === -1) {
        updated.push({ module: mod.key, actions: {} });
        modPermIndex = updated.length - 1;
      }

      const defaultAction =
        mod.availableActions.find((a) => a.key === 'view') || mod.availableActions[0];
      if (defaultAction) {
        updated[modPermIndex].actions[defaultAction.key] = { allowed: true, scope: 'OWN' };
      }

      setExpandedModules((prev) => ({ ...prev, [mod.key]: true }));
    }

    onChange(updated);
  };

  // Get specific action state
  const getActionState = (moduleKey, actionKey) => {
    const modPerm = getModulePermission(moduleKey);
    if (!modPerm || !modPerm.actions || !modPerm.actions[actionKey]) {
      return { allowed: false, scope: 'OWN' };
    }
    return modPerm.actions[actionKey];
  };

  const handleToggleAction = (moduleKey, actionKey, currentAllowed) => {
    const newAllowed = !currentAllowed;
    const updated = JSON.parse(JSON.stringify(permissions));
    let modPerm = updated.find(
      (p) => p.module && p.module.toLowerCase() === moduleKey.toLowerCase()
    );

    if (!modPerm) {
      modPerm = { module: moduleKey, actions: {} };
      updated.push(modPerm);
    }

    if (!modPerm.actions) modPerm.actions = {};
    if (!modPerm.actions[actionKey]) {
      modPerm.actions[actionKey] = { allowed: newAllowed, scope: 'OWN' };
    } else {
      modPerm.actions[actionKey].allowed = newAllowed;
    }

    onChange(updated);
  };

  const handleScopeChange = (moduleKey, actionKey, newScope) => {
    const updated = JSON.parse(JSON.stringify(permissions));
    let modPerm = updated.find(
      (p) => p.module && p.module.toLowerCase() === moduleKey.toLowerCase()
    );

    if (!modPerm) {
      modPerm = { module: moduleKey, actions: {} };
      updated.push(modPerm);
    }

    if (!modPerm.actions) modPerm.actions = {};
    if (!modPerm.actions[actionKey]) {
      modPerm.actions[actionKey] = { allowed: true, scope: newScope };
    } else {
      modPerm.actions[actionKey].scope = newScope;
    }

    onChange(updated);
  };

  // Filter modules by search term
  const filteredModules = useMemo(() => {
    if (!searchTerm.trim()) return modules;
    const q = searchTerm.toLowerCase();
    return modules.filter(
      (m) => m.name.toLowerCase().includes(q) || m.key.toLowerCase().includes(q)
    );
  }, [modules, searchTerm]);

  return (
    <div className="d-flex flex-column gap-3">
      {/* Search Filter for Matrix */}
      <div className="erp-search-group">
        <span className="erp-search-icon">
          <Search size={16} />
        </span>
        <input
          type="text"
          className="erp-input erp-search-input"
          placeholder="Filter modules in permission matrix..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredModules.map((mod) => {
        const enabled = isModuleEnabled(mod.key);
        const expanded = expandedModules[mod.key] ?? enabled;
        const actions = mod.availableActions || [];

        const activeCount = actions.filter(
          (a) => getActionState(mod.key, a.key).allowed
        ).length;

        return (
          <div
            key={mod.key}
            className={`erp-card overflow-hidden transition-normal ${
              enabled ? 'border-primary' : ''
            }`}
          >
            {/* Module Accordion Header */}
            <div
              className="d-flex justify-content-between align-items-center p-3 cursor-pointer user-select-none"
              style={{
                backgroundColor: enabled ? 'var(--erp-primary-light)' : 'var(--erp-surface-subtle)',
                borderBottom: expanded ? '1px solid var(--erp-border)' : 'none',
              }}
              onClick={() => toggleModuleExpansion(mod.key)}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="form-check form-switch m-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    className="form-check-input cursor-pointer"
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleToggleModule(mod, enabled)}
                    style={{ width: '2.5rem', height: '1.35rem' }}
                  />
                </div>

                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold" style={{ color: 'var(--erp-text-main)', fontSize: '0.95rem' }}>
                      {mod.name}
                    </span>
                    <span
                      className="font-monospace small px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.06)',
                        fontSize: '0.7rem',
                        color: 'var(--erp-text-secondary)',
                      }}
                    >
                      {mod.key}
                    </span>
                    {enabled && (
                      <span className="erp-badge erp-badge-success" style={{ fontSize: '0.675rem' }}>
                        {activeCount} / {actions.length} allowed
                      </span>
                    )}
                  </div>
                  <small className="text-muted d-block" style={{ fontSize: '0.775rem' }}>
                    {mod.description}
                  </small>
                </div>
              </div>

              <div className="text-muted p-1">
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {/* Actions Grid */}
            {expanded && (
              <div className="p-3 p-md-4 bg-white erp-fade-in">
                {!enabled && (
                  <div className="p-2.5 rounded-3 mb-3 bg-light text-muted small d-flex align-items-center gap-2">
                    <Lock size={15} />
                    <span>Module is currently disabled. Toggle switch ON to grant rights.</span>
                  </div>
                )}

                <div className="row g-3">
                  {actions.map((action) => {
                    const state = getActionState(mod.key, action.key);

                    return (
                      <div key={action.key} className="col-12 col-md-6 col-xl-4">
                        <div
                          className="p-3 rounded-3 border h-100 transition-fast"
                          style={{
                            backgroundColor: state.allowed
                              ? 'var(--erp-surface)'
                              : 'var(--erp-surface-subtle)',
                            borderColor: state.allowed ? 'var(--erp-primary)' : 'var(--erp-border)',
                            boxShadow: state.allowed ? 'var(--erp-shadow-xs)' : 'none',
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <span
                                className="fw-semibold small d-block"
                                style={{ color: 'var(--erp-text-main)' }}
                              >
                                {action.name}
                              </span>
                              <span className="font-monospace text-muted" style={{ fontSize: '0.7rem' }}>
                                {action.key}
                              </span>
                            </div>

                            <div className="form-check form-switch m-0">
                              <input
                                className="form-check-input cursor-pointer"
                                type="checkbox"
                                checked={state.allowed}
                                disabled={!enabled}
                                onChange={() =>
                                  handleToggleAction(mod.key, action.key, state.allowed)
                                }
                              />
                            </div>
                          </div>

                          {action.requiresScope ? (
                            <div className={`mt-2 ${!state.allowed ? 'opacity-40 pointer-events-none' : ''}`}>
                              <label className="erp-label" style={{ fontSize: '0.675rem' }}>
                                Data Scope Level
                              </label>
                              <select
                                className="erp-select py-1 px-2"
                                style={{ fontSize: '0.78rem' }}
                                value={state.scope}
                                disabled={!state.allowed || !enabled}
                                onChange={(e) =>
                                  handleScopeChange(mod.key, action.key, e.target.value)
                                }
                              >
                                {SCOPES.map((sc) => (
                                  <option key={sc} value={sc}>
                                    {sc} {sc === 'ALL' ? '(Global)' : sc === 'OWN' ? '(Self only)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="mt-2 text-muted" style={{ fontSize: '0.72rem' }}>
                              <CheckCircle2 size={12} className="text-success me-1 inline-block" />
                              Global action (No data scope needed)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PermissionMatrix;
