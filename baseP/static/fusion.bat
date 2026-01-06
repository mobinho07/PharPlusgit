@echo off
setlocal enabledelayedexpansion

:: Récupération de la date au format DDMMYYYY (indépendant de la région)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "datestr=%datetime:~6,2%%datetime:~4,2%%datetime:~0,4%"

:: Nom du fichier de sortie
set "output=mes js.txt"

:: Suppression du fichier s'il existe déjà pour éviter les doublons au lancement
if exist "%output%" del "%output%"

echo Fusion en cours vers %output%...

:: Boucle sur les types de fichiers (html, css, py)
for %%e in (js) do (
    for %%f in (*.%%e) do (
        :: Vérifier que ce n'est pas le fichier de sortie lui-même
        if not "%%f"=="%output%" (
            echo --- Traitement de : %%f ---
            
            :: 1. Écrire le nom du fichier
            echo Fichier : %%f >> "%output%"
            
            :: 2. Sauter une ligne
            echo. >> "%output%"
            
            :: 3. Copier le contenu du fichier
            type "%%f" >> "%output%"
            
            :: 4. Ajouter deux sauts de ligne pour séparer du prochain fichier
            echo. >> "%output%"
            echo.----------------------------Fin du fichier------------------------------- >> "%output%"
            echo. >> "%output%"
        )
    )
)

echo Traitement termine. Le fichier "%output%" a ete cree.
pause
