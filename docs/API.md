# API reference

The browser uses same-origin `/api` requests. Private routes require the HttpOnly JWT session cookie. All mutations require `X-Requested-With: SecondBrain`; browser origins must match `CLIENT_ORIGIN`. JSON errors have an `error` message. Validation uses HTTP 400, unauthenticated requests 401, CSRF rejection 403, missing/unauthorized resources 404, edit conflicts 409 and rate limits 429.

## Accounts

| Method | Route            | Purpose                                                         |
| ------ | ---------------- | --------------------------------------------------------------- |
| POST   | `/auth/register` | Register with fullName, email and password; set session cookie  |
| POST   | `/auth/login`    | Verify email/password; set session cookie                       |
| GET    | `/auth/me`       | Get current user                                                |
| POST   | `/auth/logout`   | Revoke all sessions for the current user and disconnect sockets |

## Stories

| Method | Route                                | Purpose                                                             |
| ------ | ------------------------------------ | ------------------------------------------------------------------- |
| GET    | `/public/blogs?q=&tag=&page=1`       | Published stories, nine per page; returns posts, total, page, pages |
| GET    | `/public/blogs/:id`                  | Published article                                                   |
| GET    | `/public/blogs/:id/comments?before=` | Published discussion, 30 comments per page                          |
| GET    | `/blogs`                             | Current author's stories and drafts                                 |
| GET    | `/blogs/:id`                         | Current author's full story                                         |
| POST   | `/blogs`                             | Create a story                                                      |
| PUT    | `/blogs/:id`                         | Update a story; editor supplies `version` from the loaded `__v`     |
| DELETE | `/blogs/:id`                         | Delete an owned story and its comments                              |
| POST   | `/blogs/:id/import`                  | Index a private copy of an owned story                              |
| POST   | `/blogs/:id/comments`                | Authenticated response with `content` to a published story          |
| DELETE | `/blogs/:id/comments/:commentId`     | Comment writer or story author removes a response                   |

Story fields: `title` (1–160 characters), `body` (1–100,000), `summary` (0–280), `tags` (up to five, each 1–30), `status` (`draft` or `published`), `coverTheme` (`sage`, `peach`, `lavender`, `ink`). The server supplies authorship. Updates from the editor include the version loaded before editing; conflicts preserve the newer server copy.

## Knowledge and RAG

| Method      | Route                     | Purpose                                                               |
| ----------- | ------------------------- | --------------------------------------------------------------------- |
| GET         | `/status`                 | Knowledge-service configuration/readiness                             |
| GET, POST   | `/projects`               | List or create owned projects                                         |
| GET         | `/documents`              | List owned sources                                                    |
| POST        | `/documents/note`         | Create and index a note                                               |
| POST        | `/documents/upload`       | Multipart document upload (`file`, optional title/project/tags)       |
| GET, DELETE | `/documents/:id`          | Read or delete an owned source                                        |
| GET         | `/documents/:id/download` | Download the original file                                            |
| POST        | `/documents/:id/retry`    | Retry failed ingestion                                                |
| POST        | `/search`                 | Retrieve source passages with query, mode and optional project        |
| POST        | `/ask`                    | Question, optional conversationId/project; returns saved conversation |
| GET         | `/conversations`          | List owned AI conversations                                           |
| GET, DELETE | `/conversations/:id`      | Read or delete an owned conversation                                  |

The internal FastAPI service requires `X-Service-Token`, including health calls. It is not a browser API. Express passes trusted ownership and handles the private file boundary.

## Direct messages

| Method | Route                              | Purpose                                                                   |
| ------ | ---------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/chat/users?q=`                   | Find registered users by name or exact email; returns ID and display name |
| GET    | `/chat/rooms`                      | List rooms the current user participates in                               |
| POST   | `/chat/rooms`                      | Create/reuse a direct room with `userId`                                  |
| GET    | `/chat/rooms/:id/messages?before=` | Authorized history, 50 messages per page                                  |

Socket.IO uses the session cookie. Client events: `message:send` with roomId/content/clientId and an acknowledgement callback; `typing` with roomId. Server events: `message:new`, `typing`, `room:updated`, `document:updated`. Reconnection refreshes room history. Client IDs are unique within room/sender, and the same ID returns the previously persisted message.

## Test setup

`npm test` creates an isolated temporary MongoDB and fake RAG endpoint. `npm run build` followed by `npm run test:ui` starts a separate production-build app on port 18107 with its own temporary database. No test requires an OpenAI key or modifies the development database.
