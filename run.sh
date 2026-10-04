#!/bin/bash

# ====================================================================================
# Solana Anchor Program Development Script
# ====================================================================================
# This script provides utilities for Anchor program development including:
# - Program ID generation and updating
# - Building programs
# - IDL generation
# - Deploying programs
#
# Usage Examples:
#   ./run.sh id counter         # Generate/update program ID for 'counter' program
#   ./run.sh build              # Build all programs and copy IDL/types
#   ./run.sh build 0            # Build all programs only (no IDL copy)
#   ./run.sh build 1            # Copy IDL/types only
#   ./run.sh deploy counter l   # Deploy 'counter' program to localnet
#   ./run.sh deploy counter d   # Deploy 'counter' program to devnet
#   ./run.sh deploy counter m   # Deploy 'counter' program to mainnet
#   ./run.sh deploy d           # Deploy all programs to devnet
#   ./run.sh help               # Show this help message
# ====================================================================================

# Display help information
help() {
    cat << EOF
Solana Anchor Program Development Script

USAGE:
    ./run.sh <command> [options]

COMMANDS:
    id <name>       Generate or update program ID for the specified program
                    Example: ./run.sh id counter

    build [flag]    Build programs and/or copy IDL/types
                    No flag: Build all programs AND copy IDL/types
                    0: Build all programs only (no IDL copy)
                    1: Copy IDL/types only
                    
                    Examples: 
                      ./run.sh build         # Build + copy IDL/types
                      ./run.sh build 0       # Build only
                      ./run.sh build 1       # Copy IDL/types only

    deploy [name] <cluster>
                    Deploy program(s) to the specified cluster
                    Cluster options: l (localnet), d (devnet), m (mainnet)
                    If name is omitted, deploys all programs
                    Examples:
                      ./run.sh deploy counter d    # Deploy counter to devnet
                      ./run.sh deploy d            # Deploy all to devnet
                      ./run.sh deploy counter m    # Deploy counter to mainnet

    help            Show this help message

DESCRIPTION:
    id <name>   - Generates a new keypair for the program if it doesn't exist
                - Creates backup of keypair in .test-wallets/solana-programs
                - Updates declare_id! macros in lib.rs files
                - Updates program IDs in Anchor.toml
                - Supports both programs/ and packages/ directories
    
    build       - Compiles all Anchor programs using anchor build
                - Copies IDL and types to scripts/common/schema directory
    
    deploy      - Deploys specific program or all programs to chosen cluster
    
EOF
}

# The script to generate program ID and update it in files
# Example: ./run.sh id counter
update_id() {
    clear
    # Check if name parameter is provided
    if [ -z "$1" ]; then
        echo "Usage: $0 <name>"
        exit 1
    fi
    
    NAME="$1"
    NAME_UNDERSCORE="${NAME//-/_}"  # replace - with _
    # Get program ID from existing keypair or generate new one
    KEYPAIR_FILE="target/deploy/${NAME_UNDERSCORE}-keypair.json"
    BACKUP_DIR="../.test-wallets/solana-programs"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # 1) Generate keypair if it doesn't exist
    if [ ! -f "$KEYPAIR_FILE" ]; then
        solana-keygen new --no-bip39-passphrase -o "$KEYPAIR_FILE"
        clear
    fi

    # 2) Get the pubkey
    PUBKEY=$(solana --config ~/dev/.solana-configs/localnet.yml address -k "$KEYPAIR_FILE")
    
    # 3) Update keypair filename to include program ID
    NEW_KEYPAIR_FILE="target/deploy/${NAME_UNDERSCORE}-${PUBKEY}-keypair.json"
    NEW_BACKUP_FILE="${BACKUP_DIR}/${NAME_UNDERSCORE}-${PUBKEY}-keypair.json"
    mv "$KEYPAIR_FILE" "$NEW_KEYPAIR_FILE"
    cp "$NEW_KEYPAIR_FILE" "$NEW_BACKUP_FILE"
    echo "Created keypair: $NEW_KEYPAIR_FILE"
    echo "Created backup: $NEW_BACKUP_FILE"
    
    # 4) Replace declare_id! in lib.rs files
    # Update programs directory
    LIB_RS="./programs/${NAME}/src/lib.rs"
    if [ -f "$LIB_RS" ]; then
        sed -i.bak -E "s#declare_id!\(\"[^\"]+\"\);#declare_id!(\"$PUBKEY\");#" "$LIB_RS"
        rm -f "${LIB_RS}.bak"
        echo "Updated: $LIB_RS"
    else
        echo "File not found: $LIB_RS"
    fi
    
    # Update packages directory (look for packages that include the program name)
    if [ -d "./packages" ]; then
        for package_dir in ./packages/*${NAME}*/; do
            if [ -d "$package_dir" ]; then
                PACKAGE_LIB_RS="${package_dir}src/lib.rs"
                if [ -f "$PACKAGE_LIB_RS" ]; then
                    sed -i.bak -E "s#declare_id!\(\"[^\"]+\"\);#declare_id!(\"$PUBKEY\");#" "$PACKAGE_LIB_RS"
                    rm -f "${PACKAGE_LIB_RS}.bak"
                    echo "Updated: $PACKAGE_LIB_RS"
                fi
            fi
        done
    fi
    
    # 5) Replace pubkey in Anchor.toml for localnet and devnet
    ANCHOR_TOML="./Anchor.toml"
    if [ -f "$ANCHOR_TOML" ]; then
        sed -i.bak -E "/\[programs\.localnet\]/,/\[/{s#(${NAME}[[:space:]]*=[[:space:]]*\")[^\"]+(\".*)#\1$PUBKEY\2#}" "$ANCHOR_TOML"
        sed -i.bak -E "/\[programs\.devnet\]/,/\[/{s#(${NAME}[[:space:]]*=[[:space:]]*\")[^\"]+(\".*)#\1$PUBKEY\2#}" "$ANCHOR_TOML"
        rm -f "${ANCHOR_TOML}.bak"
        echo "Updated: $ANCHOR_TOML"
    else
        echo "File not found: $ANCHOR_TOML"
    fi
    
    echo "Updated pubkey: $PUBKEY"
}

# Build all Anchor programs
build_programs() {
    clear
    
    echo "Building programs..."
    anchor build
    
    # Remove generic keypair files if they exist
    for program_dir in programs/*/; do
        if [ -d "$program_dir" ]; then
            PROGRAM_NAME=$(basename "$program_dir")
            NAME_UNDERSCORE="${PROGRAM_NAME//-/_}"
            GENERIC_KEYPAIR="target/deploy/${NAME_UNDERSCORE}-keypair.json"
            if [ -f "$GENERIC_KEYPAIR" ]; then
                rm "$GENERIC_KEYPAIR"
                echo "Removed: $GENERIC_KEYPAIR"
            fi
        fi
    done
}

# Build all Anchor programs and copy IDL/types
build() {
    build_programs
    
    SRC_IDL_PATH="./target/idl"
    SRC_TYPES_PATH="./target/types"
    
    DIST_IDL_PATH="./scripts/common/schema/idl"
    DIST_TYPES_PATH="./scripts/common/schema/types"
    
    # Copy IDL and types to distribution directory
    rm -rf "$DIST_IDL_PATH"
    rm -rf "$DIST_TYPES_PATH"
    
    if [ -d "$SRC_IDL_PATH" ]; then
        mkdir -p "$DIST_IDL_PATH"
        cp -r "$SRC_IDL_PATH/." "$DIST_IDL_PATH"
        echo "Copied IDL files to $DIST_IDL_PATH"
    fi
    
    if [ -d "$SRC_TYPES_PATH" ]; then
        mkdir -p "$DIST_TYPES_PATH"
        cp -r "$SRC_TYPES_PATH/." "$DIST_TYPES_PATH"
        echo "Copied types to $DIST_TYPES_PATH"
    fi
    
    # Clean up source directories
    rm -rf "$SRC_IDL_PATH"
    rm -rf "$SRC_TYPES_PATH"
}

# Copy IDL and types only (no build)
copy_idl_types() {
    clear
    
    SRC_IDL_PATH="./target/idl"
    SRC_TYPES_PATH="./target/types"
    
    DIST_IDL_PATH="./scripts/common/schema/idl"
    DIST_TYPES_PATH="./scripts/common/schema/types"
    
    # Copy IDL and types to distribution directory
    rm -rf "$DIST_IDL_PATH"
    rm -rf "$DIST_TYPES_PATH"
    
    if [ -d "$SRC_IDL_PATH" ]; then
        mkdir -p "$DIST_IDL_PATH"
        cp -r "$SRC_IDL_PATH/." "$DIST_IDL_PATH"
        echo "Copied IDL files to $DIST_IDL_PATH"
    else
        echo "Warning: IDL directory not found at $SRC_IDL_PATH"
    fi
    
    if [ -d "$SRC_TYPES_PATH" ]; then
        mkdir -p "$DIST_TYPES_PATH"
        cp -r "$SRC_TYPES_PATH/." "$DIST_TYPES_PATH"
        echo "Copied types to $DIST_TYPES_PATH"
    else
        echo "Warning: Types directory not found at $SRC_TYPES_PATH"
    fi
    
    # Clean up source directories
    rm -rf "$SRC_IDL_PATH"
    rm -rf "$SRC_TYPES_PATH"
}

# Deploy program(s) to specified cluster
deploy() {
    clear
    
    # Parse arguments - handle both "name cluster" and "cluster" patterns
    if [ -z "$1" ]; then
        echo "Error: Cluster required for 'deploy' command"
        echo "Usage: ./run.sh deploy [program_name] <cluster>"
        exit 1
    fi
    
    # Check if first argument is a cluster flag
    if [[ "$1" =~ ^[ldm]$ ]]; then
        # Deploy all programs
        CLUSTER_FLAG="$1"
        PROGRAM=""
    else
        # Deploy specific program
        PROGRAM="$1"
        CLUSTER_FLAG="$2"
        
        if [ -z "$CLUSTER_FLAG" ]; then
            echo "Error: Cluster required for 'deploy' command"
            echo "Usage: ./run.sh deploy $PROGRAM <cluster>"
            exit 1
        fi
    fi
    
    # Map cluster flag to CONFIG (RPC endpoint comes from json_rpc_url in the config file)
    case "$CLUSTER_FLAG" in
        "l")
            CONFIG=~/dev/.solana-configs/localnet.yml
            CLUSTER="localnet"
            ;;
        "d")
            CONFIG=~/dev/.solana-configs/devnet.yml
            CLUSTER="devnet"
            ;;
        "m")
            CONFIG=~/dev/.solana-configs/mainnet.yml
            CLUSTER="mainnet"
            ;;
        *)
            echo "Error: Invalid cluster '$CLUSTER_FLAG'. Use 'l' for localnet, 'd' for devnet, or 'm' for mainnet."
            exit 1
            ;;
    esac
    
    if [ ! -f "$CONFIG" ]; then
        echo "Error: Solana config not found: $CONFIG"
        echo "Create it with: solana config set --url <rpc_url> --config $CONFIG"
        exit 1
    fi
    
    # Remove generic keypair files if they exist
    for program_dir in programs/*/; do
        if [ -d "$program_dir" ]; then
            PROGRAM_NAME=$(basename "$program_dir")
            NAME_UNDERSCORE="${PROGRAM_NAME//-/_}"
            GENERIC_KEYPAIR="target/deploy/${NAME_UNDERSCORE}-keypair.json"
            if [ -f "$GENERIC_KEYPAIR" ]; then
                rm "$GENERIC_KEYPAIR"
                echo "Removed: $GENERIC_KEYPAIR"
            fi
        fi
    done
    
    if [ -n "$PROGRAM" ]; then
        # Deploy specific program
        NAME="$PROGRAM"
        NAME_UNDERSCORE="${NAME//-/_}"
        KEYPAIR_PATTERN="target/deploy/${NAME_UNDERSCORE}-*-keypair.json"
        KEYPAIR_FILE=$(ls $KEYPAIR_PATTERN 2>/dev/null)
        
        if [ -z "$KEYPAIR_FILE" ] || [ ! -f "$KEYPAIR_FILE" ]; then
            echo "Error: Keypair file not found matching $KEYPAIR_PATTERN"
            echo "Run './run.sh id $NAME' first to generate the program keypair"
            exit 1
        fi
        
        PROGRAM_FILE="target/deploy/${NAME_UNDERSCORE}.so"
        
        if [ ! -f "$PROGRAM_FILE" ]; then
            echo "Error: Program file not found: $PROGRAM_FILE"
            echo "Run './run.sh build' first to build the program"
            exit 1
        fi
        
        PUBKEY=$(solana --config "$CONFIG" address -k "$KEYPAIR_FILE")
        
        echo "Deploying $NAME to $CLUSTER..."
        echo "Keypair: $KEYPAIR_FILE"
        echo "Program: $PROGRAM_FILE"
        echo "Program ID: $PUBKEY"
        
        solana --config "$CONFIG" program deploy --program-id "$KEYPAIR_FILE" "$PROGRAM_FILE"
        
        if [ $? -eq 0 ]; then
            echo "Successfully deployed $NAME to $CLUSTER!"
        else
            echo "Failed to deploy $NAME"
            exit 1
        fi
    else
        # Deploy all programs
        echo "Deploying all programs to $CLUSTER..."
        SUCCESS=true
        for program_dir in programs/*/; do
            if [ -d "$program_dir" ]; then
                NAME=$(basename "$program_dir")
                NAME_UNDERSCORE="${NAME//-/_}"
                KEYPAIR_PATTERN="target/deploy/${NAME_UNDERSCORE}-*-keypair.json"
                KEYPAIR_FILE=$(ls $KEYPAIR_PATTERN 2>/dev/null)
                
                if [ -z "$KEYPAIR_FILE" ] || [ ! -f "$KEYPAIR_FILE" ]; then
                    echo "Warning: Skipping $NAME - Keypair file not found matching $KEYPAIR_PATTERN"
                    echo "Run './run.sh id $NAME' to generate the program keypair"
                    SUCCESS=false
                    continue
                fi
                
                PROGRAM_FILE="target/deploy/${NAME_UNDERSCORE}.so"
                
                if [ ! -f "$PROGRAM_FILE" ]; then
                    echo "Warning: Skipping $NAME - Program file not found: $PROGRAM_FILE"
                    SUCCESS=false
                    continue
                fi
                
                PUBKEY=$(solana --config "$CONFIG" address -k "$KEYPAIR_FILE")
                
                echo "Deploying $NAME..."
                echo "Keypair: $KEYPAIR_FILE"
                echo "Program: $PROGRAM_FILE"
                echo "Program ID: $PUBKEY"
                
                solana --config "$CONFIG" program deploy --program-id "$KEYPAIR_FILE" "$PROGRAM_FILE"
                
                if [ $? -ne 0 ]; then
                    echo "Failed to deploy $NAME"
                    SUCCESS=false
                fi
            fi
        done
        
        if $SUCCESS; then
            echo "Successfully deployed all programs to $CLUSTER!"
        else
            echo "Deployment completed with some errors"
            exit 1
        fi
    fi
}

# Main function to handle command routing
main() {
    case "$1" in
        "id")
            if [ -z "$2" ]; then
                echo "Error: Program name required for 'id' command"
                echo "Usage: ./run.sh id <program_name>"
                exit 1
            fi
            update_id "$2"
            ;;
        "build")
            case "$2" in
                "0")
                    # Build only (no IDL copy)
                    build_programs
                    ;;
                "1")
                    # Copy IDL/types only
                    copy_idl_types
                    ;;
                "")
                    # Default: build and copy IDL/types
                    build
                    ;;
                *)
                    echo "Error: Invalid build flag '$2'"
                    echo "Valid options: 0 (build only), 1 (copy IDL/types only), or no flag"
                    exit 1
                    ;;
            esac
            ;;
        "deploy")
            if [ -z "$2" ]; then
                echo "Error: Cluster or program name required for 'deploy' command"
                echo "Usage: ./run.sh deploy [program_name] <cluster>"
                exit 1
            fi
            deploy "$2" "$3"
            ;;
        "help"|"-h"|"--help")
            help
            ;;
        "")
            echo "Error: No command specified"
            echo "Run './run.sh help' for usage information"
            exit 1
            ;;
        *)
            echo "Error: Unknown command '$1'"
            echo "Run './run.sh help' for available commands"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"
