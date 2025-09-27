import {
  HttpEvent,
  HttpEventType,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  console.log(req);
  const token = localStorage.getItem('token');
  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers
        .set('Authorization', `Bearer ${token}`)
        .set('accept', 'text/plain')
        .set('Content-Type', 'application/json'),
    });
  }
  return next(authReq);
};
