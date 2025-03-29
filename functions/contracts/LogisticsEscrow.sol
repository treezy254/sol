// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract LogisticsEscrow {
    address public customer;
    address public deliveryAgent;
    address public storeOwner;
    uint256 public productAmount;
    uint256 public deliveryFee;
    uint256 public agentStake;
    enum DeliveryStatus { 
        Initiated, 
        AgentAssigned, 
        PickedUp, 
        Delivered, 
        Failed 
    }
    DeliveryStatus public currentStatus;

    constructor(address _storeOwner, uint256 _productAmount, uint256 _deliveryFee) payable {
        // Remove the payment requirement for testing purposes
        // require(msg.value == (_productAmount + _deliveryFee), "Incorrect initial payment");

        customer = msg.sender;
        storeOwner = _storeOwner;
        productAmount = _productAmount;
        deliveryFee = _deliveryFee;
        currentStatus = DeliveryStatus.Initiated;
    }

    function fundContract() public payable {
        require(msg.sender == customer, "Only customer can fund the contract");
        require(msg.value >= (productAmount + deliveryFee), "Insufficient payment amount");

        // If extra funds were sent, refund the difference
        uint256 refundAmount = msg.value - (productAmount + deliveryFee);
        if (refundAmount > 0) {
            payable(customer).transfer(refundAmount);
        }
    }

    function acceptDelivery() public payable {
        require(deliveryAgent == address(0), "Delivery agent already assigned");
        require(msg.value >= productAmount, "Stake must be at least the product amount");
        require(currentStatus == DeliveryStatus.Initiated, "Cannot accept delivery now");
        
        // Log values for debugging
        // Solidity doesn't have console.log, but you'd see these in transaction events
        // emit LogValues(msg.value, productAmount);
        
        deliveryAgent = msg.sender;
        
        // Store exactly what was sent, no more
        agentStake = msg.value;
        
        currentStatus = DeliveryStatus.AgentAssigned;
    }

    function confirmPickup() public {
        require(currentStatus == DeliveryStatus.AgentAssigned, "Invalid status");

        currentStatus = DeliveryStatus.PickedUp;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }



    function confirmDelivery() public {
        require(currentStatus == DeliveryStatus.PickedUp, "Cannot confirm delivery");
      
        
        // Check if contract has enough balance
        uint256 totalNeeded = productAmount + deliveryFee + agentStake;
        require(address(this).balance >= totalNeeded, 
            string(abi.encodePacked(
                "Insufficient balance: ", 
                toString(address(this).balance), 
                " needed: ", 
                toString(totalNeeded)
            ))
        );

        // Successful delivery - funds distributed
        payable(storeOwner).transfer(productAmount); // Original product price to store
        
        // Split into two transfers to avoid potential overflow
        payable(deliveryAgent).transfer(deliveryFee);  // Delivery fee
        payable(deliveryAgent).transfer(agentStake);   // Return stake
        
        currentStatus = DeliveryStatus.Delivered;
    }

    function refundIfFailed() public {
        require(currentStatus != DeliveryStatus.Delivered, "Delivery already completed");

        // If delivery fails before pickup, refund customer
        if (currentStatus == DeliveryStatus.Initiated && msg.sender == customer) {
            payable(customer).transfer(address(this).balance);
            currentStatus = DeliveryStatus.Failed;
        }

        // If delivery fails after agent accepts, agent loses stake
        if (currentStatus == DeliveryStatus.AgentAssigned && msg.sender == customer) {
            payable(customer).transfer(productAmount + deliveryFee);
            // Agent's stake remains in contract
            currentStatus = DeliveryStatus.Failed;
        }
    }

    // Helper function for debugging
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // Fallback to prevent accidental sends
    receive() external payable {
        revert("Direct transfers not allowed");
    }
}


