import 'express';

declare module 'express-serve-static-core' {
  interface ParamsDictionary {
    id?: string;
    username?: string;
  }
}
