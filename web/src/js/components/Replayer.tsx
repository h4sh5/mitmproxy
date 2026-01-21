import * as React from "react";
import { useAppSelector, useAppDispatch } from "../ducks";
import * as replayerActions from "../ducks/replayer";
import * as flowActions from "../ducks/flows/_backend_actions";
import type { Flow, HTTPFlow, HTTPResponse } from "../flow";
import { Message } from "./FlowView/HttpMessages";
import "./Replayer.css";

interface ResizableSplitPaneProps {
    left: React.ReactNode;
    right: React.ReactNode;
}

function ResizableSplitPane({ left, right }: ResizableSplitPaneProps) {
    const [leftWidth, setLeftWidth] = React.useState(50); // percentage
    const [isDragging, setIsDragging] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const mouseX = e.clientX - containerRect.left;
            
            // Calculate new left width as percentage
            const newLeftWidth = (mouseX / containerWidth) * 100;
            
            // Constrain between 20% and 80%
            const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
            setLeftWidth(constrainedWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    return (
        <div className="resizable-split-pane" ref={containerRef}>
            <div className="resizable-pane-left" style={{ width: `${leftWidth}%` }}>
                {left}
            </div>
            <div 
                className={`resizable-divider ${isDragging ? 'dragging' : ''}`}
                onMouseDown={handleMouseDown}
            />
            <div className="resizable-pane-right" style={{ width: `${100 - leftWidth}%` }}>
                {right}
            </div>
        </div>
    );
}

interface ReplayerFlowTabProps {
    replayerFlow: { id: string; flow: Flow; customName?: string };
    isActive: boolean;
    onClick: () => void;
    onRename: (newName: string) => void;
    onDuplicate: () => void;
    onClose: () => void;
}

function ReplayerFlowTab({ replayerFlow, isActive, onClick, onRename, onDuplicate, onClose }: ReplayerFlowTabProps) {
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [tempName, setTempName] = React.useState(replayerFlow.customName || "");
    
    const handleRenameStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRenaming(true);
        setTempName(replayerFlow.customName || "");
    };
    
    const handleRenameSubmit = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            onRename(tempName || undefined);
            setIsRenaming(false);
        } else if (e.key === "Escape") {
            setIsRenaming(false);
            setTempName(replayerFlow.customName || "");
        }
    };
    
    const handleRenameBlur = () => {
        onRename(tempName || undefined);
        setIsRenaming(false);
    };
    
    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDuplicate();
    };
    
    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };
    
    const displayName = replayerFlow.customName || replayerFlow.flow.id;
    
    return (
        <div className={`replayer-tab ${isActive ? 'active' : ''}`} onClick={onClick}>
            {isRenaming ? (
                <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={handleRenameSubmit}
                    onBlur={handleRenameBlur}
                    autoFocus
                    className="replayer-tab-input"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <>
                    <span className="replayer-tab-title" onDoubleClick={handleRenameStart}>
                        {displayName}
                    </span>
                    <button className="replayer-tab-duplicate" onClick={handleDuplicate} title="Duplicate">
                        ⧉
                    </button>
                    <button className="replayer-tab-close" onClick={handleClose} title="Close">
                        ×
                    </button>
                </>
            )}
        </div>
    );
}

interface FlowViewProps {
    flow: Flow;
}

const FlowView = React.memo(function FlowView({ flow }: FlowViewProps) {
    if (flow.type !== "http") {
        return (
            <div className="flow-not-supported">
                <p>Flow type {flow.type} is not supported in the Replayer.</p>
                <p>Only HTTP flows can be displayed in the split-pane view.</p>
            </div>
        );
    }
    
    const httpFlow = flow as HTTPFlow & { response?: HTTPResponse };
    
    const leftPane = (
        <div className="flow-view-left">
            <div className="flow-view-header">Request</div>
            <div className="flow-view-content">
                <Message flow={httpFlow} message={httpFlow.request} />
            </div>
        </div>
    );
    
    const rightPane = (
        <div className="flow-view-right">
            <div className="flow-view-header">Response</div>
            <div className="flow-view-content">
                {httpFlow.response ? (
                    <Message flow={httpFlow} message={httpFlow.response} />
                ) : (
                    <div className="no-response">
                        <p>No response received yet</p>
                    </div>
                )}
            </div>
        </div>
    );
    
    return (
        <div className="flow-view-container">
            <ResizableSplitPane left={leftPane} right={rightPane} />
        </div>
    );
});

export default function Replayer() {
    const dispatch = useAppDispatch();
    const replayerState = useAppSelector((state) => state.replayer);
    const allFlows = useAppSelector((state) => state.flows.byId);
    
    // Add marked flows to replayer when they become marked
    React.useEffect(() => {
        const markedFlows = Array.from(allFlows.values()).filter(flow => flow.marked && flow.marked.trim() !== "");
        markedFlows.forEach(flow => {
            if (!replayerState.flows.find(rf => rf.id === flow.id)) {
                dispatch(replayerActions.addFlowToReplayer(flow));
            }
        });
    }, [allFlows, dispatch]);
    
    // Remove flows from replayer only when they are deleted from the main state
    React.useEffect(() => {
        replayerState.flows.forEach(replayerFlow => {
            const flow = allFlows.get(replayerFlow.id);
            if (!flow) {
                // Flow was deleted from main state, remove from replayer
                dispatch(replayerActions.removeFlowFromReplayer(replayerFlow.id));
            }
        });
    }, [allFlows, replayerState.flows, dispatch]);
    
    // Update flows in replayer when they are updated in the main state
    React.useEffect(() => {
        replayerState.flows.forEach(replayerFlow => {
            const updatedFlow = allFlows.get(replayerFlow.id);
            if (updatedFlow && JSON.stringify(updatedFlow) !== JSON.stringify(replayerFlow.flow)) {
                dispatch(replayerActions.updateFlowInReplayer(updatedFlow));
            }
        });
    }, [allFlows, replayerState.flows, dispatch]);
    
    const handleTabClick = (flowId: string) => {
        dispatch(replayerActions.setActiveFlow(flowId));
    };
    
    const handleTabRename = (flowId: string, customName?: string) => {
        dispatch(replayerActions.renameFlow({ flowId, customName }));
    };
    
    const handleTabDuplicate = (flowId: string) => {
        const replayerFlow = replayerState.flows.find(rf => rf.id === flowId);
        if (replayerFlow) {
            dispatch(flowActions.duplicate([replayerFlow.flow])());
        }
    };
    
    const handleTabClose = (flowId: string) => {
        dispatch(replayerActions.removeFlowFromReplayer(flowId));
    };
    
    const activeReplayerFlow = replayerState.flows.find(rf => rf.id === replayerState.activeFlowId);
    
    if (replayerState.flows.length === 0) {
        return (
            <div className="replayer-empty">
                <h3>Replayer</h3>
                <p>No marked flows found.</p>
                <p>Mark flows in the Flow List to see them here.</p>
            </div>
        );
    }
    
    return (
        <div className="replayer">
            <div className="replayer-tabs">
                {replayerState.flows.map(replayerFlow => (
                    <ReplayerFlowTab
                        key={replayerFlow.id}
                        replayerFlow={replayerFlow}
                        isActive={replayerFlow.id === replayerState.activeFlowId}
                        onClick={() => handleTabClick(replayerFlow.id)}
                        onRename={(customName) => handleTabRename(replayerFlow.id, customName)}
                        onDuplicate={() => handleTabDuplicate(replayerFlow.id)}
                        onClose={() => handleTabClose(replayerFlow.id)}
                    />
                ))}
            </div>
            {activeReplayerFlow && (
                <div className="replayer-content">
                    <FlowView flow={activeReplayerFlow.flow} />
                </div>
            )}
        </div>
    );
}
