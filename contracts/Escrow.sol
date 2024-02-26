//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {
    address public nftAddress;
    address payable public seller;
    address public inspector;
    address public lender;
    address public lawyer;

    modifier onlyBuyer(uint256 _nftID) {
        require(msg.sender == buyer[_nftID], "Escrow: Only buyer can call this method");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Escrow: Only seller can call this method");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector, "Escrow: Only inspector can call this method");
        _;
    }

    modifier onlyLawyer() {
        require(msg.sender == lawyer, "Escrow: Only lawyer can call this method");
        _;
    }

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => bool) public legalPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    event SaleFinalized(uint256 indexed nftID, address indexed buyer, address indexed seller, uint256 salePrice);

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address _lender,
        address _lawyer
    ) {
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
        lawyer = _lawyer;
    }

    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
      
    ) public payable onlySeller {
        // Transfer NFT from seller to this contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID);

        isListed[_nftID] = true;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
        buyer[_nftID] = _buyer;
      
    }

    // Put Under Contract (only buyer - payable escrow)
    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(msg.value >= escrowAmount[_nftID]);
    }

    // Update Inspection Status (only inspector)
    function updateInspectionStatus(uint256 _nftID, bool _passed)
        public
        onlyInspector
    {
        inspectionPassed[_nftID] = _passed;
    }

    function updateLegalStatus(uint256 _nftID, bool _passed)
        public
        onlyLawyer
    {
        legalPassed[_nftID] = _passed;
    }

    // Approve Sale
    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    // Finalize Sale
    // -> Require inspection status (add more items here, like appraisal)
    // -> Require sale to be authorized
    // -> Require funds to be correct amount
    // -> Transfer NFT to buyer
    // -> Transfer Funds to Seller

    bool private locked;

    modifier noReentrant() {
        require(!locked, "Escrow: Reentrant call detected");
        locked = true;
        _;
        locked = false;
    }
    
    // Finalize Sale
    function finalizeSale(uint256 _nftID) public noReentrant {
        // Check
        require(inspectionPassed[_nftID], "Escrow: Inspection not passed");
        require(legalPassed[_nftID], "Escrow: Legal check not passed");
        require(approval[_nftID][buyer[_nftID]], "Escrow: Buyer has not approved the sale");
        require(approval[_nftID][seller], "Escrow: Seller has not approved the sale");
        require(approval[_nftID][lender], "Escrow: Lender has not approved the sale");
        uint256 price = purchasePrice[_nftID];
        require(address(this).balance >= price, "Escrow: Contract does not have enough balance");

        // Effects
        isListed[_nftID] = false;
        purchasePrice[_nftID] = 0; // Resetting the purchase price
        escrowAmount[_nftID] = 0; // Resetting the escrow amount

        // Interactions
        (bool success, ) = payable(seller).call{value: price}("");
        require(success, "Transfer to seller failed");

        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID);

        emit SaleFinalized(_nftID, buyer[_nftID], seller, price);
    }

    modifier onlyBuyerOrSeller(uint256 _nftID) {
        require(
            msg.sender == buyer[_nftID] || msg.sender == seller,
            "Escrow: Only buyer or seller can call this method"
        );
        _;
    }

    function cancelSale(uint256 _nftID) public onlyBuyerOrSeller(_nftID) {
        require(isListed[_nftID], "Escrow: NFT not listed");
        
        address buyerAddress = buyer[_nftID];
        uint256 refundAmount = escrowAmount[_nftID];

        // Reset the listing status and amounts to prevent reentrancy
        isListed[_nftID] = false;
        buyer[_nftID] = address(0); // Reset buyer address
        escrowAmount[_nftID] = 0;
        purchasePrice[_nftID] = 0;

        if (!inspectionPassed[_nftID]) {
            require(msg.sender == buyerAddress, "Escrow: Only specific buyer can cancel before inspection");
            require(address(this).balance >= refundAmount, "Escrow: Insufficient balance for refund");

            // Refund the earnest money to the specific buyer
            (bool refundSuccess, ) = payable(buyerAddress).call{value: refundAmount}("");
            require(refundSuccess, "Escrow: Refund to buyer failed");
        } else {
            require(msg.sender == seller, "Escrow: Only seller can cancel after inspection");
            require(address(this).balance >= refundAmount, "Escrow: Insufficient balance for sale");

            // Transfer the sale amount to the seller
            (bool saleSuccess, ) = payable(seller).call{value: refundAmount}("");
            require(saleSuccess, "Escrow: Transfer to seller failed");
        }
    }

    function resetListing(uint256 _nftID) private {
        isListed[_nftID] = false;
        buyer[_nftID] = address(0); // Reset buyer address
        escrowAmount[_nftID] = 0;
        purchasePrice[_nftID] = 0;
    }


    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
