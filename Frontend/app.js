// Digital Sovereignty - Frontend JavaScript
class DigitalSovereigntyApp {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.userAccount = null;
        this.contractAddress = '0x...'; // Replace with deployed contract address
        this.contractABI = [
            // Contract ABI will be added here after deployment
            {
                "inputs": [
                    {"internalType": "string", "name": "dataId", "type": "string"},
                    {"internalType": "string", "name": "dataHash", "type": "string"},
                    {"internalType": "string", "name": "category", "type": "string"},
                    {"internalType": "uint256", "name": "price", "type": "uint256"},
                    {"internalType": "bool", "name": "isPublic", "type": "bool"}
                ],
                "name": "registerDataAsset",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "address", "name": "dataOwner", "type": "address"},
                    {"internalType": "string", "name": "dataId", "type": "string"},
                    {"internalType": "string", "name": "purpose", "type": "string"}
                ],
                "name": "requestDataAccess",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "string", "name": "dataId", "type": "string"},
                    {"internalType": "address", "name": "requester", "type": "address"},
                    {"internalType": "bool", "name": "approve", "type": "bool"}
                ],
                "name": "manageAccessRequest",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getUserDataIds",
                "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "address", "name": "owner", "type": "address"},
                    {"internalType": "string", "name": "dataId", "type": "string"}
                ],
                "name": "getDataAsset",
                "outputs": [
                    {"internalType": "string", "name": "dataHash", "type": "string"},
                    {"internalType": "string", "name": "category", "type": "string"},
                    {"internalType": "uint256", "name": "price", "type": "uint256"},
                    {"internalType": "bool", "name": "isPublic", "type": "bool"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "dataId", "type": "string"}],
                "name": "getAccessRequests",
                "outputs": [
                    {"internalType": "address[]", "name": "requesters", "type": "address[]"},
                    {"internalType": "uint256[]", "name": "prices", "type": "uint256[]"},
                    {"internalType": "string[]", "name": "purposes", "type": "string[]"},
                    {"internalType": "bool[]", "name": "pendingStatus", "type": "bool[]"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "withdraw",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ];
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.checkWalletConnection();
        this.showSection('dashboard');
    }
    
    setupEventListeners() {
        // Wallet connection
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());
        
        // Form submissions
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegisterData(e));
        document.getElementById('requestForm').addEventListener('submit', (e) => this.handleRequestAccess(e));
        
        // Modal controls
        document.querySelector('.close').addEventListener('click', () => this.closeRequestModal());
        document.getElementById('requestModal').addEventListener('click', (e) => {
            if (e.target.id === 'requestModal') this.closeRequestModal();
        });
        
        // Tab switching for requests
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const tabType = e.target.textContent.includes('Incoming') ? 'incoming' : 'outgoing';
                this.showRequestTab(tabType);
            }
        });
    }
    
    async checkWalletConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await this.connectWallet();
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }
        }
    }
    
    async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                this.showStatus('Please install MetaMask or another Web3 wallet', 'error');
                return;
            }
            
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.userAccount = accounts[0];
            
            // Initialize ethers
            this.web3 = new ethers.BrowserProvider(window.ethereum);
            const signer = await this.web3.getSigner();
            
            // Initialize contract (replace with actual deployed address)
            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, signer);
            
            // Update UI
            this.updateWalletInfo();
            this.showStatus('Wallet connected successfully!', 'success');
            
            // Load user data
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.showStatus('Failed to connect wallet', 'error');
        }
    }
    
    async updateWalletInfo() {
        if (!this.userAccount) return;
        
        try {
            const balance = await this.web3.getBalance(this.userAccount);
            const balanceInEth = ethers.formatEther(balance);
            
            document.getElementById('userBalance').textContent = `${parseFloat(balanceInEth).toFixed(4)} ETH`;
            document.getElementById('connectWallet').textContent = `${this.userAccount.slice(0, 6)}...${this.userAccount.slice(-4)}`;
            document.getElementById('connectWallet').classList.add('connected');
        } catch (error) {
            console.error('Error updating wallet info:', error);
        }
    }
    
    async handleRegisterData(event) {
        event.preventDefault();
        
        if (!this.contract) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }
        
        const formData = new FormData(event.target);
        const dataId = formData.get('dataId');
        const dataHash = formData.get('dataHash');
        const category = formData.get('category');
        const price = ethers.parseEther(formData.get('price'));
        const isPublic = formData.has('isPublic');
        
        try {
            this.showStatus('Registering data asset...', 'info');
            
            const tx = await this.contract.registerDataAsset(
                dataId, dataHash, category, price, isPublic
            );
            
            this.showStatus('Transaction submitted. Waiting for confirmation...', 'info');
            await tx.wait();
            
            this.showStatus('Data asset registered successfully!', 'success');
            event.target.reset();
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showStatus(`Registration failed: ${error.message}`, 'error');
        }
    }
    
    async handleRequestAccess(event) {
        event.preventDefault();
        
        if (!this.contract) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }
        
        const owner = document.getElementById('requestOwner').value;
        const dataId = document.getElementById('requestDataId').value;
        const purpose = document.getElementById('purpose').value;
        const price = document.getElementById('requestPrice').textContent;
        
        try {
            this.showStatus('Sending access request...', 'info');
            
            const tx = await this.contract.requestDataAccess(
                owner, dataId, purpose,
                { value: ethers.parseEther(price) }
            );
            
            this.showStatus('Request submitted. Waiting for confirmation...', 'info');
            await tx.wait();
            
            this.showStatus('Access request sent successfully!', 'success');
            this.closeRequestModal();
            
        } catch (error) {
            console.error('Request error:', error);
            this.showStatus(`Request failed: ${error.message}`, 'error');
        }
    }
    
    async loadDashboardData() {
        if (!this.contract || !this.userAccount) return;
        
        try {
            // Get user's data IDs
            const dataIds = await this.contract.getUserDataIds(this.userAccount);
            document.getElementById('totalAssets').textContent = dataIds.length;
            
            // Load user's data assets
            await this.loadUserDataAssets(dataIds);
            
            // Calculate total earnings (simplified - in real app, you'd track this)
            document.getElementById('totalEarnings').textContent = '0.0 ETH';
            
            // Count pending requests
            let totalPendingRequests = 0;
            for (const dataId of dataIds) {
                try {
                    const requests = await this.contract.getAccessRequests(dataId);
                    const pendingCount = requests.pendingStatus.filter(status => status).length;
                    totalPendingRequests += pendingCount;
                } catch (error) {
                    console.error(`Error getting requests for ${dataId}:`, error);
                }
            }
            document.getElementById('pendingRequests').textContent = totalPendingRequests;
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }
    
    async loadUserDataAssets(dataIds) {
        const container = document.getElementById('userDataAssets');
        container.innerHTML = '';
        
        if (dataIds.length === 0) {
            container.innerHTML = '<p class="text-center">No data assets registered yet.</p>';
            return;
        }
        
        for (const dataId of dataIds) {
            try {
                const assetData = await this.contract.getDataAsset(this.userAccount, dataId);
                const assetElement = this.createDataAssetElement(dataId, assetData);
                container.appendChild(assetElement);
            } catch (error) {
                console.error(`Error loading asset ${dataId}:`, error);
            }
        }
    }
    
    createDataAssetElement(dataId, assetData) {
        const [dataHash, category, price, isPublic, timestamp] = assetData;
        const priceInEth = ethers.formatEther(price);
        const date = new Date(Number(timestamp) * 1000).toLocaleDateString();
        
        const element = document.createElement('div');
        element.className = 'data-item';
        element.innerHTML = `
            <h4>${dataId} <span class="badge ${isPublic ? 'public' : 'private'}">${isPublic ? 'Public' : 'Private'}</span></h4>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Price:</strong> ${priceInEth} ETH</p>
            <p><strong>IPFS Hash:</strong> ${dataHash.slice(0, 20)}...</p>
            <p><strong>Registered:</strong> ${date}</p>
            <div class="data-actions">
                <button class="btn btn-primary" onclick="app.viewAccessRequests('${dataId}')">View Requests</button>
                <button class="btn btn-danger" onclick="app.deleteDataAsset('${dataId}')">Delete</button>
            </div>
        `;
        return element;
    }
    
    async searchUserData() {
        const ownerAddress = document.getElementById('ownerAddress').value;
        if (!ownerAddress) {
            this.showStatus('Please enter a valid address', 'error');
            return;
        }
        
        if (!this.contract) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }
        
        try {
            const dataIds = await this.contract.getUserDataIds(ownerAddress);
            const container = document.getElementById('marketplaceResults');
            container.innerHTML = '';
            
            if (dataIds.length === 0) {
                container.innerHTML = '<p class="text-center">No public data assets found for this address.</p>';
                return;
            }
            
            for (const dataId of dataIds) {
                try {
                    const assetData = await this.contract.getDataAsset(ownerAddress, dataId);
                    const [dataHash, category, price, isPublic] = assetData;
                    
                    if (isPublic) {
                        const element = this.createMarketplaceItem(ownerAddress, dataId, assetData);
                        container.appendChild(element);
                    }
                } catch (error) {
                    console.error(`Error loading marketplace asset ${dataId}:`, error);
                }
            }
            
        } catch (error) {
            console.error('Search error:', error);
            this.showStatus('Search failed', 'error');
        }
    }
    
    createMarketplaceItem(owner, dataId, assetData) {
        const [dataHash, category, price, isPublic, timestamp] = assetData;
        const priceInEth = ethers.formatEther(price);
        const date = new Date(Number(timestamp) * 1000).toLocaleDateString();
        
        const element = document.createElement('div');
        element.className = 'data-item';
        element.innerHTML = `
            <h4>${dataId}</h4>
            <p><strong>Owner:</strong> ${owner.slice(0, 10)}...</p>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Price:</strong> ${priceInEth} ETH</p>
            <p><strong>Registered:</strong> ${date}</p>
            <div class="data-actions">
                <button class="btn btn-primary" onclick="app.openRequestModal('${owner}', '${dataId}', '${priceInEth}')">Request Access</button>
            </div>
        `;
        return element;
    }
    
    openRequestModal(owner, dataId, price) {
        document.getElementById('requestOwner').value = owner;
        document.getElementById('requestDataId').value = dataId;
        document.getElementById('requestDataIdDisplay').textContent = dataId;
        document.getElementById('requestPrice').textContent = price;
        
        const modal = document.getElementById('requestModal');
        modal.classList.add('active');
    }
    
    closeRequestModal() {
        const modal = document.getElementById('requestModal');
        modal.classList.remove('active');
        document.getElementById('requestForm').reset();
    }
    
    async viewAccessRequests(dataId) {
        // Switch to requests section and show incoming requests for this data ID
        this.showSection('requests');
        this.showRequestTab('incoming');
        await this.loadIncomingRequests();
    }
    
    async loadIncomingRequests() {
        if (!this.contract || !this.userAccount) return;
        
        const container = document.getElementById('incomingRequestsList');
        container.innerHTML = '<div class="loading"></div>';
        
        try {
            const dataIds = await this.contract.getUserDataIds(this.userAccount);
            container.innerHTML = '';
            
            let hasRequests = false;
            
            for (const dataId of dataIds) {
                try {
                    const requests = await this.contract.getAccessRequests(dataId);
                    
                    for (let i = 0; i < requests.requesters.length; i++) {
                        if (requests.pendingStatus[i]) {
                            hasRequests = true;
                            const element = this.createRequestElement(
                                dataId,
                                requests.requesters[i],
                                requests.prices[i],
                                requests.purposes[i],
                                'incoming'
                            );
                            container.appendChild(element);
                        }
                    }
                } catch (error) {
                    console.error(`Error loading requests for ${dataId}:`, error);
                }
            }
            
            if (!hasRequests) {
                container.innerHTML = '<p class="text-center">No incoming requests at the moment.</p>';
            }
            
        } catch (error) {
            console.error('Error loading incoming requests:', error);
            container.innerHTML = '<p class="text-center">Error loading requests.</p>';
        }
    }
    
    createRequestElement(dataId, requester, price, purpose, type) {
        const priceInEth = ethers.formatEther(price);
        
        const element = document.createElement('div');
        element.className = 'request-item';
        
        if (type === 'incoming') {
            element.innerHTML = `
                <h4>Request for: ${dataId}</h4>
                <p><strong>Requester:</strong> ${requester.slice(0, 20)}...</p>
                <p><strong>Offered Price:</strong> ${priceInEth} ETH</p>
                <p><strong>Purpose:</strong> ${purpose}</p>
                <div class="data-actions">
                    <button class="btn btn-success" onclick="app.manageRequest('${dataId}', '${requester}', true)">Approve</button>
                    <button class="btn btn-danger" onclick="app.manageRequest('${dataId}', '${requester}', false)">Deny</button>
                </div>
            `;
        }
        
        return element;
    }
    
    async manageRequest(dataId, requester, approve) {
        if (!this.contract) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showStatus(`
