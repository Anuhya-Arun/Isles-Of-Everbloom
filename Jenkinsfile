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
                bat 'if not exist Dockerfile exit /b 1'

                echo 'Checking JavaScript syntax...'
                bat 'node --check game.js'

                echo 'Build validation completed successfully.'
            }
        }

        stage('Test/Validate') {
            steps {
                echo 'Validating application contents...'

                bat '''
                findstr /I /C:"Isles of Everbloom" index.html
                if errorlevel 1 exit /b 1

                findstr /I /C:"style.css" index.html
                if errorlevel 1 exit /b 1

                findstr /I /C:"game.js" index.html
                if errorlevel 1 exit /b 1
                '''

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