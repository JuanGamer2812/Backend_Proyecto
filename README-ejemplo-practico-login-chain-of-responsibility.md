# 5. Ejemplo Práctico: Cadena de Responsabilidad en el Login

## 5.1. Caso práctico sencillo

Imaginemos un flujo de login con estos pasos mínimos:

1. Comprobar que el usuario envía **email** y **contraseña**.  
2. Verificar que el **email** tiene un formato válido.  
3. Buscar al usuario en la base de datos y comprobar que existe.  
4. Verificar que la **contraseña** es correcta.  

El **controlador de login** no quiere tener toda esta lógica mezclada en un solo método. En lugar de eso, crea una **cadena de “handlers”**, donde cada uno se ocupa de un paso y, si todo está bien, pasa el control al siguiente.

---

## 5.2. Código claro (backend simplificado)

### 1) Contexto compartido del login

```js
// loginContext.js
class LoginContext {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.user = null;
    this.isHandled = false; // si algún handler responde, se detiene la cadena
  }
}

module.exports = LoginContext;
```

### 2) Handler base

```js
// loginHandler.js
class LoginHandler {
  setNext(handler) {
    this.next = handler;
    return handler; // permite encadenar: h1.setNext(h2).setNext(h3)...
  }

  async handle(context) {
    if (this.next && !context.isHandled) {
      await this.next.handle(context);
    }
  }
}

module.exports = LoginHandler;
```

### 3) Handlers concretos

#### a) Validar que hay email y password

```js
// handlers/LoginBodyValidationHandler.js
const LoginHandler = require('../loginHandler');

class LoginBodyValidationHandler extends LoginHandler {
  async handle(context) {
    const { email, password } = context.req.body;

    if (!email || !password) {
      context.isHandled = true;
      return context.res.status(400).json({
        message: 'El email y la contraseña son obligatorios.',
      });
    }

    // si todo va bien, pasa al siguiente
    await super.handle(context);
  }
}

module.exports = LoginBodyValidationHandler;
```

#### b) Validar formato de email

```js
// handlers/EmailFormatHandler.js
const LoginHandler = require('../loginHandler');

class EmailFormatHandler extends LoginHandler {
  async handle(context) {
    const { email } = context.req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      context.isHandled = true;
      return context.res.status(400).json({
        message: 'El formato del email es inválido.',
      });
    }

    await super.handle(context);
  }
}

module.exports = EmailFormatHandler;
```

#### c) Buscar usuario y verificar contraseña (simplificado)

```js
// handlers/FindUserAndPasswordHandler.js
const LoginHandler = require('../loginHandler');
// aquí se podría usar tu modelo real de usuario
// const Usuario = require('../../models/usuario.models');

class FindUserAndPasswordHandler extends LoginHandler {
  async handle(context) {
    const { email, password } = context.req.body;

    // Ejemplo muy simplificado (en la práctica se consulta BD)
    if (email !== 'demo@ejemplo.com' || password !== '1234') {
      context.isHandled = true;
      return context.res.status(401).json({
        message: 'Credenciales incorrectas.',
      });
    }

    // Simulamos un usuario encontrado
    context.user = { id: 1, email, nombre: 'Usuario Demo' };

    await super.handle(context);
  }
}

module.exports = FindUserAndPasswordHandler;
```

#### d) Respuesta de éxito

```js
// handlers/LoginSuccessHandler.js
const LoginHandler = require('../loginHandler');

class LoginSuccessHandler extends LoginHandler {
  async handle(context) {
    context.isHandled = true;
    return context.res.status(200).json({
      message: 'Login exitoso.',
      user: context.user,
      // token: '...', // aquí podría ir un JWT
    });
  }
}

module.exports = LoginSuccessHandler;
```

### 4) Uso de la cadena en el controlador de login

```js
// usuario.controller.js (método login)
const LoginContext = require('../login/loginContext');
const LoginBodyValidationHandler = require('../login/handlers/LoginBodyValidationHandler');
const EmailFormatHandler = require('../login/handlers/EmailFormatHandler');
const FindUserAndPasswordHandler = require('../login/handlers/FindUserAndPasswordHandler');
const LoginSuccessHandler = require('../login/handlers/LoginSuccessHandler');

exports.login = async (req, res) => {
  const context = new LoginContext(req, res);

  const bodyValidation = new LoginBodyValidationHandler();
  const emailFormat = new EmailFormatHandler();
  const findUserAndPassword = new FindUserAndPasswordHandler();
  const success = new LoginSuccessHandler();

  bodyValidation
    .setNext(emailFormat)
    .setNext(findUserAndPassword)
    .setNext(success);

  await bodyValidation.handle(context);
};
```

En las rutas:

```js
// usuario.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuario.controller');

router.post('/login', controller.login);

module.exports = router;
```

---

## 5.3. Código claro (frontend simplificado en Angular)

En el frontend hacemos algo análogo, pero a nivel de validación y navegación.

### 1) Contexto y handler base

```ts
// auth/login-context.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginContext {
  request: LoginRequest;
  user?: any;
}

export interface LoginHandler {
  setNext(handler: LoginHandler): LoginHandler;
  handle(context: LoginContext): Promise<void>;
}

export abstract class AbstractLoginHandler implements LoginHandler {
  private nextHandler: LoginHandler | null = null;

  setNext(handler: LoginHandler): LoginHandler {
    this.nextHandler = handler;
    return handler;
  }

  async handle(context: LoginContext): Promise<void> {
    if (this.nextHandler) {
      await this.nextHandler.handle(context);
    }
  }
}
```

### 2) Handlers concretos sencillos

#### a) Validar campos obligatorios

```ts
// auth/handlers/required-fields.handler.ts
import { AbstractLoginHandler } from '../login-context';
import { LoginContext } from '../login-context';

export class RequiredFieldsHandler extends AbstractLoginHandler {
  async handle(context: LoginContext): Promise<void> {
    const { email, password } = context.request;

    if (!email || !password) {
      throw new Error('El email y la contraseña son obligatorios.');
    }

    await super.handle(context);
  }
}
```

#### b) Validar formato de email

```ts
// auth/handlers/email-format.handler.ts
import { AbstractLoginHandler, LoginContext } from '../login-context';

export class EmailFormatHandler extends AbstractLoginHandler {
  async handle(context: LoginContext): Promise<void> {
    const { email } = context.request;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new Error('El formato del email es inválido.');
    }

    await super.handle(context);
  }
}
```

#### c) Llamada al backend y navegación

```ts
// auth/handlers/backend-login-and-redirect.handler.ts
import { AbstractLoginHandler, LoginContext } from '../login-context';
import { AuthService } from 'src/app/service/auth.service';
import { Router } from '@angular/router';

export class BackendLoginAndRedirectHandler extends AbstractLoginHandler {
  constructor(private authService: AuthService, private router: Router) {
    super();
  }

  async handle(context: LoginContext): Promise<void> {
    const { email, password } = context.request;

    const response = await this.authService.login(email, password).toPromise();
    context.user = response.user;

    await this.router.navigate(['/home']); // o según rol

    // aquí podríamos seguir la cadena si hubiera más pasos
  }
}
```

### 3) Uso de la cadena en el componente de login

```ts
// components/login/login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';

import { LoginContext } from 'src/app/auth/login-context';
import { RequiredFieldsHandler } from 'src/app/auth/handlers/required-fields.handler';
import { EmailFormatHandler } from 'src/app/auth/handlers/email-format.handler';
import { BackendLoginAndRedirectHandler } from 'src/app/auth/handlers/backend-login-and-redirect.handler';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  async onSubmit(): Promise<void> {
    const context: LoginContext = {
      request: { email: this.email, password: this.password },
    };

    const required = new RequiredFieldsHandler();
    const emailFormat = new EmailFormatHandler();
    const backend = new BackendLoginAndRedirectHandler(this.authService, this.router);

    required.setNext(emailFormat).setNext(backend);

    try {
      await required.handle(context);
    } catch (err: any) {
      this.errorMessage = err.message || 'Error al iniciar sesión.';
    }
  }
}
```

---

## 5.4. ¿Cómo se aplica el patrón en este ejemplo?

En este ejemplo el patrón **Cadena de Responsabilidad** se ve claramente:

- En **backend**:
  - Los **handlers concretos** (`LoginBodyValidationHandler`, `EmailFormatHandler`, `FindUserAndPasswordHandler`, `LoginSuccessHandler`) son los eslabones de la cadena.
  - `LoginHandler` es el **handler base** que sabe cómo encadenar y delegar.
  - `LoginContext` es el **contexto compartido** donde viajan la petición, la respuesta y el usuario.
  - El método `login` del controlador es el **cliente**, que construye la cadena y la ejecuta.

- En **frontend**:
  - `RequiredFieldsHandler`, `EmailFormatHandler` y `BackendLoginAndRedirectHandler` son los **handlers** del lado cliente.
  - `AbstractLoginHandler` define la mecánica de la cadena.
  - `LoginContext` transporta la información del formulario y el usuario.
  - `LoginComponent` actúa como **cliente**, disparando la cadena.

La idea central es la misma en ambos lados:

- El **login** no se resuelve con un único paso, sino con una **secuencia de responsabilidades**.  
- Cada responsabilidad se aísla en un handler que:
  - Decide si **maneja** la petición (por ejemplo, devolviendo un error).
  - O la **pasa al siguiente** eslabón de la cadena si todo está correcto.
- El código del controlador/componente queda **limpio y extensible**: si más adelante se quiere añadir, por ejemplo, un paso de 2FA, solo se añade un nuevo handler en la cadena sin romper lo anterior.
