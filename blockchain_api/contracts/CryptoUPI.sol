// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CryptoUPI
 * @dev A simple UPI-like payment system for the Monad Testnet.
 * Users can register unique handles and send crypto using them.
 */
contract CryptoUPI {
    // Standard error messages for gas efficiency and clarity
    error HandleAlreadyRegistered(string handle);
    error AddressAlreadyHasHandle(address wallet, string handle);
    error HandleNotFound(string handle);
    error InvalidHandleLength();
    error TransferFailed();
    error CannotPaySelf();

    // Mappings for handle resolution
    mapping(string => address) public handleToAddress;
    mapping(address => string) public addressToHandle;

    // Events for off-chain tracking (The Boss Rule: Real product mindset)
    event HandleRegistered(address indexed wallet, string handle);
    event PaymentSent(
        address indexed from,
        address indexed to,
        uint256 amount,
        string fromHandle,
        string toHandle,
        string note,
        uint256 timestamp
    );

    /**
     * @dev Registers a unique UPI handle for the caller's address.
     * @param handle The desired handle (e.g., "alice", "bob").
     */
    function registerHandle(string calldata handle) external {
        if (bytes(handle).length < 3 || bytes(handle).length > 20) revert InvalidHandleLength();
        if (handleToAddress[handle] != address(0)) revert HandleAlreadyRegistered(handle);
        if (bytes(addressToHandle[msg.sender]).length != 0) revert AddressAlreadyHasHandle(msg.sender, addressToHandle[msg.sender]);

        handleToAddress[handle] = msg.sender;
        addressToHandle[msg.sender] = handle;

        emit HandleRegistered(msg.sender, handle);
    }

    /**
     * @dev Sends crypto to another user using their UPI handle.
     * @param toHandle The handle of the recipient.
     * @param note An optional note for the transaction.
     */
    function payByHandle(string calldata toHandle, string calldata note) external payable {
        address recipient = handleToAddress[toHandle];
        if (recipient == address(0)) revert HandleNotFound(toHandle);
        if (recipient == msg.sender) revert CannotPaySelf();
        if (msg.value == 0) revert TransferFailed();

        string memory fromHandle = addressToHandle[msg.sender];

        (bool success, ) = recipient.call{value: msg.value}("");
        if (!success) revert TransferFailed();

        emit PaymentSent(
            msg.sender,
            recipient,
            msg.value,
            fromHandle,
            toHandle,
            note,
            block.timestamp
        );
    }

    /**
     * @dev Resolves a handle to an address for UI/Frontend.
     * @param handle The UPI handle to resolve.
     */
    function resolveHandle(string calldata handle) external view returns (address) {
        return handleToAddress[handle];
    }
}
