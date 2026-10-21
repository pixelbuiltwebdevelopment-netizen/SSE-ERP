import React, { useState } from 'react';
import { SCOPES } from '../../utils/constants';

const PermissionMatrix = ({ modules, permissions, onChange }) => {
  const [expandedModules, setExpandedModules] = useState({});

  // Get module level permission state (is it toggled ON at all?)
  const getModulePermission = (moduleKey) => {
    return permissions.find(
      (p) => p.module && p.module.toLowerCase() === moduleKey.toLowerCase()
    );
  };

  const isModuleEnabled = (moduleKey) => {
    const modPerm = getModulePermission(moduleKey);
    if (!modPerm || !modPerm.actions) return false;
    // Considered enabled if ANY action is allowed
    return Object.values(modPerm.actions).some(action => action.allowed);
  };

  const toggleModuleExpansion = (moduleKey) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  // Toggle the entire module ON/OFF
  const handleToggleModule = (mod, isCurrentlyEnabled) => {
    const updated = JSON.parse(JSON.stringify(permissions));
    let modPermIndex = updated.findIndex(
      (p) => p.module && p.module.toLowerCase() === mod.key.toLowerCase()
    );

    if (isCurrentlyEnabled) {
      // Turn OFF: disable all actions
      if (modPermIndex >= 0) {
        Object.keys(updated[modPermIndex].actions).forEach(key => {
          updated[modPermIndex].actions[key].allowed = false;
        });
      }
    } else {
      // Turn ON: Enable default 'view' action or first action
      if (modPermIndex === -1) {
        updated.push({ module: mod.key, actions: {} });
        modPermIndex = updated.length - 1;
      }
      
      const defaultAction = mod.availableActions.find(a => a.key === 'view') || mod.availableActions[0];
      if (defaultAction) {
        updated[modPermIndex].actions[defaultAction.key] = { allowed: true, scope: 'OWN' };
      }
      
      // Auto expand when enabled
      setExpandedModules(prev => ({ ...prev, [mod.key]: true }));
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

  return (
    <div className="d-flex flex-column gap-3">
      {modules.map((mod) => {
        const enabled = isModuleEnabled(mod.key);
        const expanded = expandedModules[mod.key];
        const actions = mod.availableActions || [];

        return (
          <div key={mod.key} className={`card border ${enabled ? 'border-primary shadow-sm' : 'border-secondary-subtle'}`}>
            <div 
              className={`card-header d-flex justify-content-between align-items-center cursor-pointer ${enabled ? 'bg-primary-subtle' : 'bg-light'}`}
              onClick={() => toggleModuleExpansion(mod.key)}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="form-check form-switch m-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    className="form-check-input cursor-pointer fs-5"
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleToggleModule(mod, enabled)}
                  />
                </div>
                <div>
                  <h6 className="mb-0 fw-bold">{mod.name}</h6>
                  <small className="text-muted" style={{fontSize: '12px'}}>{mod.description}</small>
                </div>
              </div>
              <div>
                <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-secondary`}></i>
              </div>
            </div>

            {expanded && (
              <div className="card-body bg-white py-4">
                {!enabled && (
                  <div className="alert alert-warning py-2 mb-4" style={{fontSize: '14px'}}>
                    <i className="bi bi-info-circle me-2"></i> Toggle the module ON above to enable these permissions.
                  </div>
                )}
                
                <div className="row g-4">
                  {actions.map(action => {
                    const state = getActionState(mod.key, action.key);
                    
                    return (
                      <div key={action.key} className="col-md-4 col-sm-6">
                        <div className={`p-3 border rounded h-100 ${state.allowed ? 'border-success bg-success-subtle bg-opacity-10' : 'border-light bg-light'}`}>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <span className="fw-semibold" style={{fontSize: '14px'}}>{action.name}</span>
                            <div className="form-check form-switch m-0">
                              <input
                                className="form-check-input cursor-pointer"
                                type="checkbox"
                                checked={state.allowed}
                                disabled={!enabled}
                                onChange={() => handleToggleAction(mod.key, action.key, state.allowed)}
                              />
                            </div>
                          </div>
                          
                          {action.requiresScope && (
                            <div className={`mt-3 ${!state.allowed ? 'opacity-25 pointer-events-none' : ''}`}>
                              <label className="text-muted small fw-medium mb-1 d-block" style={{fontSize: '11px'}}>DATA SCOPE</label>
                              <select
                                className="form-select form-select-sm"
                                value={state.scope}
                                disabled={!state.allowed || !enabled}
                                onChange={(e) => handleScopeChange(mod.key, action.key, e.target.value)}
                              >
                                {SCOPES.map((sc) => (
                                  <option key={sc} value={sc}>{sc}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {!action.requiresScope && (
                            <div className="mt-3 text-muted" style={{fontSize: '11px'}}>
                              <i className="bi bi-check2-circle me-1"></i> Global Action (No scope)
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
