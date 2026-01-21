import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Flow } from "../../flow";

export interface ReplayerFlow {
    id: string;
    flow: Flow;
    customName?: string;
}

export interface ReplayerState {
    flows: ReplayerFlow[];
    activeFlowId: string | null;
}

const initialState: ReplayerState = {
    flows: [],
    activeFlowId: null,
};

const replayerSlice = createSlice({
    name: "replayer",
    initialState,
    reducers: {
        addFlowToReplayer: (state, action: PayloadAction<Flow>) => {
            const flow = action.payload;
            if (!state.flows.find(f => f.id === flow.id)) {
                state.flows.push({
                    id: flow.id,
                    flow,
                });
                if (!state.activeFlowId) {
                    state.activeFlowId = flow.id;
                }
            }
        },
        removeFlowFromReplayer: (state, action: PayloadAction<string>) => {
            const flowId = action.payload;
            state.flows = state.flows.filter(f => f.id !== flowId);
            if (state.activeFlowId === flowId) {
                state.activeFlowId = state.flows.length > 0 ? state.flows[0].id : null;
            }
        },
        setActiveFlow: (state, action: PayloadAction<string>) => {
            state.activeFlowId = action.payload;
        },
        renameFlow: (state, action: PayloadAction<{ flowId: string; customName?: string }>) => {
            const { flowId, customName } = action.payload;
            const replayerFlow = state.flows.find(f => f.id === flowId);
            if (replayerFlow) {
                replayerFlow.customName = customName && customName.trim() !== "" ? customName : undefined;
            }
        },
        clearReplayer: (state) => {
            state.flows = [];
            state.activeFlowId = null;
        },
        updateFlowInReplayer: (state, action: PayloadAction<Flow>) => {
            const flow = action.payload;
            const replayerFlow = state.flows.find(f => f.id === flow.id);
            if (replayerFlow) {
                replayerFlow.flow = flow;
            }
        },
    },
});

export const {
    addFlowToReplayer,
    removeFlowFromReplayer,
    setActiveFlow,
    renameFlow,
    clearReplayer,
    updateFlowInReplayer,
} = replayerSlice.actions;

export default replayerSlice.reducer;