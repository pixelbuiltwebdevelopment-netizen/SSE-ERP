import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { roleApi } from '../../api/roleApi';

export const fetchRoles = createAsyncThunk(
  'roles/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await roleApi.getRoles();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch roles');
    }
  }
);

const roleSlice = createSlice({
  name: 'roles',
  initialState: {
    roles: [],
    loading: false,
    error: null,
  },
  reducers: {
    roleCreated: (state, action) => {
      const newRole = action.payload;
      if (!state.roles.some(r => r._id === newRole._id)) {
        state.roles.push(newRole);
      }
    },
    roleUpdated: (state, action) => {
      const updatedRole = action.payload;
      const index = state.roles.findIndex(r => r._id === updatedRole._id);
      if (index !== -1) {
        state.roles[index] = updatedRole;
      }
    },
    roleDeleted: (state, action) => {
      state.roles = state.roles.filter(r => r._id !== action.payload._id);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { roleCreated, roleUpdated, roleDeleted } = roleSlice.actions;

export default roleSlice.reducer;
