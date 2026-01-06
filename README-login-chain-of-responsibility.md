# Patrón Cadena de Responsabilidad aplicado al Login

## 1. Contexto del proyecto

El proyecto cuenta con un backend en Node.js/Express ubicado en `BackEnd_Proyecto/`, donde el módulo de usuarios se define en:

- Rutas: `src/routes/usuario.routes.js`
- Controlador: `src/controllers/usuario.controller.js`

Actualmente, las rutas de usuario exponen operaciones de lectura (`getAll`, `getById`). Para el flujo de **login**, se propone añadir un endpoint `POST /usuario/login` y aplicar el patrón **Cadena de Responsabilidad (Chain of Responsibility)** para estructurar las validaciones y pasos de autenticación.

---

## 2. Idea general del patrón en el login

En un proceso de login típico no se realiza una sola operación, sino una **secuencia de pasos**, por ejemplo:

1. Validar que el cuerpo de la petición (`req.body`) tiene email y contraseña.
2. Validar el formato del email.
3. Buscar al usuario en la base de datos.
4. Verificar la contraseña.
5. Verificar que la cuenta esté activa/verificada.
6. Generar la respuesta de éxito (y opcionalmente un token/JWT).

Con **Chain of Responsibility**, cada uno de estos pasos se implementa como un **Handler**:

- Cada handler:
  - Recibe un contexto con la petición y respuesta.
  - Intenta manejar su parte del proceso (validación, consulta, etc.).
  - Si hay error, responde y detiene la cadena.
  - Si todo es correcto, delega al siguiente handler en la cadena.

De esta manera se desacopla el controlador principal de los detalles de cada validación o verificación.

---

## 3. Integración propuesta en la estructura actual

### 3.1. Nuevo endpoint de login

En `src/routes/usuario.routes.js` se añade la ruta de login:

```javascript
const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuario.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/login', controller.login); // NUEVO ENDPOINT

module.exports = router;
```

### 3.2. Método `login` en `usuario.controller.js`

En `src/controllers/usuario.controller.js` se define el método `login` como **cliente** de la cadena de responsabilidad:

```javascript
const LoginContext = require('../login/loginContext');
const LoginBodyValidationHandler = require('../login/handlers/LoginBodyValidationHandler');
const EmailFormatHandler = require('../login/handlers/EmailFormatHandler');
const FindUserHandler = require('../login/handlers/FindUserHandler');
const PasswordCheckHandler = require('../login/handlers/PasswordCheckHandler');
const AccountStatusHandler = require('../login/handlers/AccountStatusHandler');
const LoginSuccessHandler = require('../login/handlers/LoginSuccessHandler');

exports.login = async (req, res) => {
  const context = new LoginContext(req, res);

  const bodyValidation = new LoginBodyValidationHandler();
  const emailFormat = new EmailFormatHandler();
  const findUser = new FindUserHandler();
  const passwordCheck = new PasswordCheckHandler();
  const accountStatus = new AccountStatusHandler();
  const success = new LoginSuccessHandler();

  bodyValidation
    .setNext(emailFormat)
    .setNext(findUser)
    .setNext(passwordCheck)
    .setNext(accountStatus)
    .setNext(success);

  await bodyValidation.handle(context);
};
```

En este código:

- `login` construye la **cadena de handlers**.
- La petición entra por el primer handler (`bodyValidation`) y se va propagando al resto si todo es correcto.

---

## 4. Estructura de la carpeta de login

Para mantener el código organizado, se propone crear la siguiente estructura dentro de `src/`:

```text
src/
  login/
    loginContext.js
    loginHandler.js
    handlers/
      LoginBodyValidationHandler.js
      EmailFormatHandler.js
      FindUserHandler.js
      PasswordCheckHandler.js
      AccountStatusHandler.js
      LoginSuccessHandler.js
```

### 4.1. Contexto de login

`src/login/loginContext.js`:

```javascript
class LoginContext {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.user = null;       // Usuario encontrado en BD
    this.isHandled = false; // Indica si ya se respondió al cliente
  }
}

module.exports = LoginContext;
```

Este contexto se pasa entre todos los handlers de la cadena.

### 4.2. Handler base

`src/login/loginHandler.js`:

```javascript
class LoginHandler {
  setNext(handler) {
    this.next = handler;
    return handler; // Permite encadenar: h1.setNext(h2).setNext(h3)...
  }

  async handle(context) {
    if (this.next && !context.isHandled) {
      await this.next.handle(context);
    }
  }
}

module.exports = LoginHandler;
```

Todos los handlers concretos heredan de esta clase.

### 4.3. Handlers concretos (resumen)

Cada handler representa un paso del proceso de login.

#### 1) `LoginBodyValidationHandler.js`

Valida que `email` y `password` existan en `req.body`.

#### 2) `EmailFormatHandler.js`

Valida que el email tenga un formato correcto.

#### 3) `FindUserHandler.js`

Usa el modelo o servicio de usuario para buscar el usuario por email en la base de datos.

#### 4) `PasswordCheckHandler.js`

Verifica que la contraseña proporcionada coincida con la almacenada (idealmente usando hash/bcrypt).

#### 5) `AccountStatusHandler.js`

Comprueba que la cuenta esté activa/verificada según los campos del modelo (por ejemplo, `activo`, `verificado`).

#### 6) `LoginSuccessHandler.js`

Genera la respuesta de éxito (por ejemplo, datos del usuario y un token JWT) y marca el contexto como manejado.

Cada uno de estos handlers, si detecta un error, responde al cliente con el código HTTP adecuado (`400`, `401`, `403`, `404`, etc.) y establece `context.isHandled = true` para detener la cadena.

---

## 5. Relación con el patrón Cadena de Responsabilidad

- **Handlers**: son las clases concretas como `LoginBodyValidationHandler`, `EmailFormatHandler`, `FindUserHandler`, etc.
- **Handler base**: `LoginHandler` define cómo encadenar y delegar la petición.
- **Contexto**: `LoginContext` almacena la información compartida (req, res, usuario, estado de manejo).
- **Cliente (Client)**: el método `login` del controlador de usuario (`usuario.controller.js`), que crea la cadena y la ejecuta.
- **Cadena**: se construye con las llamadas a `setNext`, definiendo el orden de los pasos del login.

Este patrón permite agregar o modificar pasos en el proceso de login sin alterar la estructura general del controlador, favoreciendo un código más modular y mantenible.

---

## 6. Ventajas y desventajas en el contexto del login

### Ventajas

- **Desacoplamiento**: el controlador `login` no contiene toda la lógica de validaciones y verificaciones; solo construye la cadena.
- **Extensibilidad**: es sencillo añadir nuevos pasos al login (por ejemplo, un handler de 2FA) insertándolo en la cadena.
- **Reutilización**: ciertos handlers (como validación de email o estado de cuenta) pueden reutilizarse en otros flujos.
- **Mantenibilidad**: cada clase tiene una responsabilidad clara (SRP), facilitando pruebas y cambios.

### Desventajas

- **Mayor número de clases/archivos**: aumenta la cantidad de archivos para un solo flujo (login).
- **Complejidad en proyectos pequeños**: si el login es muy simple, la cadena puede parecer sobreingeniería.
- **Depuración**: seguir el flujo a través de varios handlers requiere entender bien el orden de la cadena.

---

## 7. Posible extensión al frontend (Angular)

En el frontend (`ProyectoV2.7`), el apartado de login también puede beneficiarse conceptualmente del patrón:

- **Cadena de validación y acciones** en el componente de login:
  - Validar formulario (campos obligatorios, formato email, longitud de contraseña).
  - Llamar al backend (`AuthService`).
  - Guardar token y datos de usuario.
  - Redirigir según rol (`Router.navigate`).

Aunque no se implemente literalmente con clases de handlers en Angular, la idea de **encadenar responsabilidades** se mantiene y se puede documentar como parte del diseño inspirado en el patrón Cadena de Responsabilidad.
