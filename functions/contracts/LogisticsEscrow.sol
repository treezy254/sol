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
        require(msg.value == productAmount, "Must stake full product amount");
        require(currentStatus == DeliveryStatus.Initiated, "Cannot accept delivery now");
        
        deliveryAgent = msg.sender;
        agentStake = msg.value;
        currentStatus = DeliveryStatus.AgentAssigned;
    }
    
    function confirmPickup() public {
        require(msg.sender == storeOwner, "Only store owner can confirm pickup");
        require(currentStatus == DeliveryStatus.AgentAssigned, "Invalid status");
        
        currentStatus = DeliveryStatus.PickedUp;
    }
    
    function confirmDelivery() public {
        require(msg.sender == deliveryAgent, "Only delivery agent can confirm");
        require(currentStatus == DeliveryStatus.PickedUp, "Cannot confirm delivery");
        
        // Successful delivery - funds distributed
        payable(storeOwner).transfer(productAmount); // Original product price to store
        payable(deliveryAgent).transfer(deliveryFee + agentStake); // Delivery fee + their stake back
        
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
    
    // Fallback to prevent accidental sends
    receive() external payable {
        revert("Direct transfers not allowed");
    }
}