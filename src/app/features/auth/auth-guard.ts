import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../../services/user-service';

export const authGuard: CanActivateFn = (route, state) => {
const router = inject(Router)
const userService = inject(UserService)

return userService.isLoggedIn() ? true: router.navigate(['/login'])

};
