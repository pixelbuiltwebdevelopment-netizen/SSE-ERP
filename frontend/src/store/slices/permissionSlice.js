import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activePermissions: [],
};

const permissionSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setPermissions: (state, action) => {
      state.activePermissions = action.payload;
    },
  },
});

export const { setPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
