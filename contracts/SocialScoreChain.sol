// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DigitalSovereignty {
    
    struct DataAsset {
        string dataHash;      // IPFS hash of encrypted data
        string category;      // e.g., "personal", "medical", "financial"
        uint256 price;        // Price for data access (in wei)
        bool isPublic;        // Whether data is publicly accessible
        uint256 timestamp;    // When data was registered
        mapping(address => bool) authorizedUsers; // Users with access permission
    }
    
    struct AccessRequest {
        address requester;
        string dataId;
        uint256 offerPrice;
        string purpose;
        bool isPending;
        uint256 timestamp;
    }
    
    // Mappings
    mapping(address => mapping(string => DataAsset)) public userDataAssets;
    mapping(address => string[]) public userDataIds;
    mapping(string => AccessRequest[]) public dataAccessRequests;
    mapping(address => uint256) public userBalances;
    
    // Events
    event DataRegistered(address indexed owner, string indexed dataId, string category);
    event AccessRequested(address indexed requester, address indexed owner, string indexed dataId, uint256 price);
    event AccessGranted(address indexed owner, address indexed requester, string indexed dataId);
    event DataDeleted(address indexed owner, string indexed dataId);
    event PaymentReceived(address indexed payer, address indexed recipient, uint256 amount);
    
    modifier onlyDataOwner(string memory dataId) {
        require(bytes(userDataAssets[msg.sender][dataId].dataHash).length > 0, "Data not found or not owned by caller");
        _;
    }
    
    // Core Function 1: Register Data Asset
    function registerDataAsset(
        string memory dataId,
        string memory dataHash,
        string memory category,
        uint256 price,
        bool isPublic
    ) external {
        require(bytes(dataId).length > 0, "Data ID cannot be empty");
        require(bytes(dataHash).length > 0, "Data hash cannot be empty");
        require(bytes(userDataAssets[msg.sender][dataId].dataHash).length == 0, "Data ID already exists");
        
        DataAsset storage newAsset = userDataAssets[msg.sender][dataId];
        newAsset.dataHash = dataHash;
        newAsset.category = category;
        newAsset.price = price;
        newAsset.isPublic = isPublic;
        newAsset.timestamp = block.timestamp;
        
        userDataIds[msg.sender].push(dataId);
        
        emit DataRegistered(msg.sender, dataId, category);
    }
    
    // Core Function 2: Request Data Access
    function requestDataAccess(
        address dataOwner,
        string memory dataId,
        string memory purpose
    ) external payable {
        require(dataOwner != msg.sender, "Cannot request access to own data");
        require(bytes(userDataAssets[dataOwner][dataId].dataHash).length > 0, "Data not found");
        
        DataAsset storage asset = userDataAssets[dataOwner][dataId];
        require(!asset.isPublic || msg.value >= asset.price, "Insufficient payment for data access");
        
        // Store the payment
        if (msg.value > 0) {
            userBalances[address(this)] += msg.value;
        }
        
        AccessRequest memory newRequest = AccessRequest({
            requester: msg.sender,
            dataId: dataId,
            offerPrice: msg.value,
            purpose: purpose,
            isPending: true,
            timestamp: block.timestamp
        });
        
        dataAccessRequests[dataId].push(newRequest);
        
        emit AccessRequested(msg.sender, dataOwner, dataId, msg.value);
        
        // Auto-grant access for public data with sufficient payment
        if (asset.isPublic && msg.value >= asset.price) {
            _grantAccess(dataOwner, dataId, msg.sender, msg.value);
        }
    }
    
    // Core Function 3: Grant/Deny Data Access
    function manageAccessRequest(
        string memory dataId,
        address requester,
        bool approve
    ) external onlyDataOwner(dataId) {
        AccessRequest[] storage requests = dataAccessRequests[dataId];
        
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].requester == requester && requests[i].isPending) {
                requests[i].isPending = false;
                
                if (approve) {
                    _grantAccess(msg.sender, dataId, requester, requests[i].offerPrice);
                } else {
                    // Refund the payment if access is denied
                    if (requests[i].offerPrice > 0) {
                        userBalances[address(this)] -= requests[i].offerPrice;
                        payable(requester).transfer(requests[i].offerPrice);
                    }
                }
                break;
            }
        }
    }
    
    // Internal function to grant access
    function _grantAccess(address owner, string memory dataId, address requester, uint256 payment) internal {
        userDataAssets[owner][dataId].authorizedUsers[requester] = true;
        
        // Transfer payment to data owner
        if (payment > 0) {
            userBalances[address(this)] -= payment;
            userBalances[owner] += payment;
            emit PaymentReceived(requester, owner, payment);
        }
        
        emit AccessGranted(owner, requester, dataId);
    }
    
    // Additional Functions
    
    // Update data asset details
    function updateDataAsset(
        string memory dataId,
        uint256 newPrice,
        bool newIsPublic
    ) external onlyDataOwner(dataId) {
        userDataAssets[msg.sender][dataId].price = newPrice;
        userDataAssets[msg.sender][dataId].isPublic = newIsPublic;
    }
    
    // Delete data asset
    function deleteDataAsset(string memory dataId) external onlyDataOwner(dataId) {
        delete userDataAssets[msg.sender][dataId];
        
        // Remove from user's data IDs array
        string[] storage userIds = userDataIds[msg.sender];
        for (uint i = 0; i < userIds.length; i++) {
            if (keccak256(bytes(userIds[i])) == keccak256(bytes(dataId))) {
                userIds[i] = userIds[userIds.length - 1];
                userIds.pop();
                break;
            }
        }
        
        emit DataDeleted(msg.sender, dataId);
    }
    
    // Check if user has access to data
    function hasAccess(address owner, string memory dataId, address user) external view returns (bool) {
        return userDataAssets[owner][dataId].authorizedUsers[user] || 
               userDataAssets[owner][dataId].isPublic ||
               owner == user;
    }
    
    // Get user's data IDs
    function getUserDataIds(address user) external view returns (string[] memory) {
        return userDataIds[user];
    }
    
    // Get data asset details
    function getDataAsset(address owner, string memory dataId) external view returns (
        string memory dataHash,
        string memory category,
        uint256 price,
        bool isPublic,
        uint256 timestamp
    ) {
        DataAsset storage asset = userDataAssets[owner][dataId];
        return (asset.dataHash, asset.category, asset.price, asset.isPublic, asset.timestamp);
    }
    
    // Withdraw earnings
    function withdraw() external {
        uint256 balance = userBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        userBalances[msg.sender] = 0;
        payable(msg.sender).transfer(balance);
    }
    
    // Get access requests for a data asset
    function getAccessRequests(string memory dataId) external view returns (
        address[] memory requesters,
        uint256[] memory prices,
        string[] memory purposes,
        bool[] memory pendingStatus
    ) {
        AccessRequest[] storage requests = dataAccessRequests[dataId];
        
        requesters = new address[](requests.length);
        prices = new uint256[](requests.length);
        purposes = new string[](requests.length);
        pendingStatus = new bool[](requests.length);
        
        for (uint i = 0; i < requests.length; i++) {
            requesters[i] = requests[i].requester;
            prices[i] = requests[i].offerPrice;
            purposes[i] = requests[i].purpose;
            pendingStatus[i] = requests[i].isPending;
        }
    }
}
