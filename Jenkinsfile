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
                echo 'Installing project dependencies...'
                sh 'npm ci'

                echo 'Checking project structure...'
                sh 'test -f index.html'
                sh 'test -f style.css'
                sh 'test -f game.js'
                sh 'test -f main.js'
                sh 'test -f package.json'
                sh 'test -f package-lock.json'
                sh 'test -f Dockerfile'

                echo 'Project build validation completed.'
            }
        }

        stage('Test/Validate') {
            steps {
                echo 'Validating application contents...'

                sh 'grep -q "Isles of Everbloom" index.html'
                sh 'grep -q "style.css" index.html'
                sh 'grep -q "game.js" index.html'
                sh 'grep -q "Phaser" index.html'

                echo 'Application validation successful.'
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker image...'

                sh 'docker build -t isles-of-everbloom:latest .'
            }
        }

        stage('Result') {
            steps {
                echo 'Docker image created successfully.'

                sh 'docker images isles-of-everbloom:latest'
            }
        }
    }
}