import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DeepfakeResults {
    isDeepfake: boolean;
    confidence: number;
    faceDetected: boolean;
}

const initialState: DeepfakeResults = {
    isDeepfake: false,
    confidence: 0,
    faceDetected: false,
};

export const deepfakeSlice = createSlice({
    name: 'deepfake',
    initialState,
    reducers: {
        setDeepfakeResults: (state, action: PayloadAction<DeepfakeResults>) => {
            state.isDeepfake = action.payload.isDeepfake;
            state.confidence = action.payload.confidence;
            state.faceDetected = action.payload.faceDetected;
        },
    },
});

export const { setDeepfakeResults } = deepfakeSlice.actions;
export default deepfakeSlice.reducer;
