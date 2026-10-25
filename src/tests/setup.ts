// Tests wipe tables, so refuse to run against anything but a *_test database
if (!process.env.DB_NAME?.endsWith("_test")) {
  throw new Error(
    `Refusing to run tests against "${process.env.DB_NAME}": DB_NAME must end with _test`,
  );
}
