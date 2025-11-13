import path from "path";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import expressOasGenerator from "express-oas-generator";

import { createDatabase } from "./db/db_setup.js";
import adminRouter from "./routers/admin.js";
import seriesRouter from "./routers/series.js";
import settingsRouter from "./routers/settings.js";
import userMediaRouter from "./routers/user_media.js";
import { authRouter, verifyJWT } from "./routers/auth.js";
import mediaManagerRouter from "./routers/media_manager.js";


dotenv.config();
createDatabase();

const app = express();

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


expressOasGenerator.handleResponses(app, {
  alwaysServeDocs: true,
  writeIntervalMs: 0,
  specOutputPath: path.join(__dirname, "swagger.json"),
  
});

//middleware
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "./static")));
app.set("views", path.join(__dirname, "./pages"));
app.set("view engine", "ejs");
app.use("/users_profiles", express.static(path.join(__dirname, "../users_profiles")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// basic pages
app.get("/signup", (req, res) => res.render("signup"));
app.get("/login", (req, res) => res.render("login"));
app.get("/home", (req, res) => res.redirect("/dashboard"));
app.get("/", (req, res) => res.redirect("/signup"));
app.get("/dashboard", verifyJWT, (req, res) => {const user = req.user;res.render("dashboard", { user });});



//route
app.use("/api/auth", authRouter);
app.use("/series", seriesRouter);
app.use("/settings", settingsRouter);
app.use("/api/media", mediaManagerRouter);
app.use("/user_media", userMediaRouter);
app.use("/admin", adminRouter);



app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup({
    openapi: "3.0.0",
    info: {
      title: "Cinemate API",
      version: "1.0.0",
      description: "Full API documentation for Cinemate V2",
    },
    servers: [
      { url: "http://localhost:5000", description: "Local server" }
    ],
    paths: {
      "/signup": {
        get: {
          summary: "Render signup page",
          responses: { "200": { description: "Signup page" } }
        }
      },
      "/login": {
        get: {
          summary: "Render login page",
          responses: { "200": { description: "Login page" } }
        }
      },
      "/dashboard": {
        get: {
          summary: "Render dashboard page",
          responses: { "200": { description: "Dashboard page" } }
        }
      },
      "/": {
        get: {
          summary: "Redirect to signup page",
          responses: { "302": { description: "Redirect" } }
        }
      },

      "/api/auth/signup": {
        post: {
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    password: { type: "string" }
                  },
                  required: ["firstName", "lastName", "email", "password"]
                }
              }
            }
          },
          responses: {
            "200": { description: "User registered successfully" },
            "400": { description: "Email already registered" }
          }
        }
      },
      "/api/auth/login": {
        post: {
          summary: "User login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" }
                  },
                  required: ["email", "password"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      user: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          email: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": { description: "Invalid credentials" }
          }
        }
      },
      "/api/auth/logout": {
        post: {
          summary: "User logout",
          responses: {
            "200": {
              description: "Logged out successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/auth/change-password": {
        post: {
          summary: "Change user password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    oldPassword: { type: "string" },
                    newPassword: { type: "string" }
                  },
                  required: ["oldPassword", "newPassword"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Password changed successfully" },
            "400": { description: "Invalid password" }
          }
        }
      },
      "/api/auth/delete": {
        delete: {
          summary: "Delete user account",
          responses: { "200": { description: "User deleted successfully" } }
        }
      },

      "/series/{id}": {
        get: {
          summary: "Get series by ID",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } }
          ],
          responses: { "200": { description: "Series object returned" } }
        }
      },

      "/settings": {
        get: {
          summary: "Get user settings",
          responses: { "200": { description: "Settings page" } }
        }
      },
      "/settings/password": {
        get: {
          summary: "Password settings",
          responses: { "200": { description: "Password settings page" } }
        }
      },
      "/settings/profile": {
        get: {
          summary: "Profile settings",
          responses: { "200": { description: "Profile page" } }
        }
      },

      "/api/media": {
        get: {
          summary: "Get all media",
          responses: { "200": { description: "List of media" } }
        }
      },
      "/api/media/search": {
        get: {
          summary: "Search media",
          parameters: [
            { name: "query", in: "query", required: true, schema: { type: "string" } }
          ],
          responses: { "200": { description: "Search results" } }
        }
      },
      "/api/media/sync": {
        get: {
          summary: "Sync media",
          responses: { "200": { description: "Media synced successfully" } }
        }
      }
    },
  })
);




app.get("/api-docs/json", (req, res) => {
  res.json(expressOasGenerator.getSpec());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📘 Swagger docs: http://localhost:${PORT}/api-docs`);

  expressOasGenerator.handleRequests();
});
