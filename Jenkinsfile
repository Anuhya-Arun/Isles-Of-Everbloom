pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out Isles of Everbloom from GitHub...'
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo 'Validating project structure...'

                bat 'if not exist index.html exit /b 1'
                bat 'if not exist style.css exit /b 1'
                bat 'if not exist game.js exit /b 1'
                bat 'if not exist main.js exit /b 1'
                bat 'if not exist package.json exit /b 1'
                bat 'if not exist package-lock.json exit /b 1'
                bat 'if not exist Dockerfile exit /b 1'

                echo 'Checking JavaScript syntax...'

                bat 'node --check main.js'
                bat 'node --check game.js'

                echo 'Build validation completed successfully.'
            }
        }

        stage('Test/Validate') {
            steps {
                echo 'Validating application contents...'

                bat 'findstr /C:"Isles of Everbloom" index.html >nul'
                bat 'findstr /C:"style.css" index.html >nul'
                bat 'findstr /C:"game.js" index.html >nul'
                bat 'findstr /C:"Phaser" index.html >nul'

                echo 'Application validation successful.'
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker image...'

                bat 'docker build -t isles-of-everbloom:latest .'
            }
        }

        stage('Result') {
            steps {
                echo 'Docker image created successfully.'

                bat 'docker images isles-of-everbloom:latest'
            }
        }
    }
}