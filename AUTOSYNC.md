# AutoSync RockCatalogo

Este proyecto tiene sincronización automática bidireccional entre esta
copia local y el repositorio de GitHub
(`Dev-YuriCardiso/rockcatalogo`).

## Cómo funciona

Un script de fondo (`autosync.ps1`) revisa la carpeta cada 15 segundos y hace
tres cosas automáticamente:

1. **Enviar lo local a GitHub:** si hay cambios sin confirmar en `main`, los
   confirma con un mensaje `Auto-sync: <fecha>` y los sube a GitHub.
2. **Traer lo de GitHub:** si hay cambios nuevos en GitHub (por ejemplo,
   hechos desde Lovable o GitHub Desktop), los descarga y los aplica.
3. **Subir commits:** cualquier `git commit` hecho a mano se sube solo,
   gracias al hook de git `post-commit`.

Logs de cada acción: `rockcatalogo-sync/autosync.log` (fuera del repo).

## Cómo empezarlo / pararlo

- **Iniciar ahora (ventana actual):**
  `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\YuriCardisi\.cline\data\workspaces\chat\rockcatalogo-sync\autosync.ps1"`
- **Arranque automático al iniciar Windows:** ya registrado como tarea
  `RockCatalogo-AutoSync` en el Programador de tareas de Windows.
- **Pararlo:** ejecuta en PowerShell:
  `schtasks /end /tn "RockCatalogo-AutoSync"`
  y cierra la ventana del script si está abierta.

> **Importante (Lovable):** este proyecto está conectado a Lovable. No hagas
> `force push`, `--amend` o `rebase` sobre commits ya subidos, porque en
> Lovable se perdería historia del proyecto.

> **Nota sobre `.env`:** el archivo `.env` ya está versionado en el repo.
> Si cambia, también se subirá automáticamente.