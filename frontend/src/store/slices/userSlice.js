import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '../../api/userApi';

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await userApi.getUsers(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading: false,
    error: null,
  },
  reducers: {
    userCreated: (state, action) => {
      const newUser = action.payload;
      if (!state.users.some(u => u._id === newUser._id)) {
        state.users.unshift(newUser);
      }
    },
    userUpdated: (state, action) => {
      const updatedUser = action.payload;
      const index = state.users.findIndex(u => u._id === updatedUser._id);
      if (index !== -1) {
        state.users[index] = updatedUser;
      }
    },
    userDeleted: (state, action) => {
      state.users = state.users.filter(u => u._id !== action.payload._id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { userCreated, userUpdated, userDeleted } = userSlice.actions;

export default userSlice.reducer;
