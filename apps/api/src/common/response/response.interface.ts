export interface ApiResponse<TData> {
  success: true;
  data: TData;
  message: string;
  timestamp: string;
  total?: number;
  page?: number;
  pageSize?: number;
}
