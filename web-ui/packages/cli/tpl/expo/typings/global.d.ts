declare global {
  /**
   * 分页查询参数
   */
  declare interface PageQuery {
    pageNum: number;
    pageSize: number;
  }

  export interface CMDResult<T> {
    code: number;
    msg: string;
    data: T | null;
  }
}

export {};
