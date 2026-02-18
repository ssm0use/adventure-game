#!/bin/bash
cd "$(dirname "$0")"

echo "====================================="
echo "  Cursed Farm Adventure - Launcher"
echo "====================================="
echo ""

# Check for Python 3
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    # Verify it's Python 3
    PYTHON_VERSION=$(python --version 2>&1)
    if [[ "$PYTHON_VERSION" == *"Python 3"* ]]; then
        PYTHON_CMD="python"
    else
        PYTHON_CMD=""
    fi
else
    PYTHON_CMD=""
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "ERROR: Python 3 is not installed on this computer."
    echo ""
    echo "Python is needed to run a local web server for the game."
    echo ""
    read -p "Would you like to install Python now? (y/n): " INSTALL_CHOICE
    echo ""

    if [[ "$INSTALL_CHOICE" == "y" || "$INSTALL_CHOICE" == "Y" ]]; then
        # Check if Homebrew is available
        if command -v brew &> /dev/null; then
            echo "Installing Python 3 via Homebrew..."
            brew install python3
        else
            echo "Homebrew is not installed. Opening the Python download page..."
            echo "Please download and install Python 3 from the website,"
            echo "then run this launcher again."
            echo ""
            open "https://www.python.org/downloads/"
            read -p "Press Enter to exit..."
            exit 1
        fi

        # Verify installation succeeded
        if command -v python3 &> /dev/null; then
            PYTHON_CMD="python3"
            echo ""
            echo "Python 3 installed successfully!"
            echo ""
        else
            echo ""
            echo "Installation may require restarting your terminal."
            echo "Please close this window and run the launcher again."
            read -p "Press Enter to exit..."
            exit 1
        fi
    else
        echo "You can install Python 3 manually from: https://www.python.org/downloads/"
        echo "Then run this launcher again."
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

echo "Starting Cursed Farm Adventure..."
echo ""

# Start the server in the background
$PYTHON_CMD -m http.server 8000 &
SERVER_PID=$!

# Wait for the server to be ready
echo "Waiting for server to start..."
for i in $(seq 1 30); do
    if curl -s -o /dev/null http://localhost:8000 2>/dev/null; then
        break
    fi
    sleep 0.2
done

echo "Opening browser at http://localhost:8000"
echo ""
echo "The game is now running!"
echo "Press Ctrl+C to stop the server when done."
echo ""
open http://localhost:8000

# Bring the server back to the foreground so Ctrl+C works
wait $SERVER_PID
