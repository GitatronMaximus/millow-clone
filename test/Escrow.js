const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller, inspector, lender, lawyer, attacker
    let realEstate, escrow

    beforeEach(async () => {
        // Setup accounts
        [buyer, seller, inspector, lender, lawyer, attacker] = await ethers.getSigners()

        // Deploy Real Estate
        const RealEstate = await ethers.getContractFactory('RealEstate')
        realEstate = await RealEstate.deploy()

        // Mint 
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS")
        await transaction.wait()

        // Deploy Escrow
        const Escrow = await ethers.getContractFactory('Escrow')
        escrow = await Escrow.deploy(
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address,
            lawyer.address,
        )

        // Approve Property
        transaction = await realEstate.connect(seller).approve(escrow.address, 1)
        await transaction.wait()

        // List Property
        transaction = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(5))
        await transaction.wait()
    })        

    describe('Deployment', () => {
        describe('Success', () => {

            it('Returns NFT address', async () => {
                const result = await escrow.nftAddress()
                expect(result).to.be.equal(realEstate.address)
            })

            it('Returns seller', async () => {
                const result = await escrow.seller()
                expect(result).to.be.equal(seller.address)
            })

            it('Returns inspector', async () => {
                const result = await escrow.inspector()
                expect(result).to.be.equal(inspector.address)
            })

            it('Returns lender', async () => {
                const result = await escrow.lender()
                expect(result).to.be.equal(lender.address)

                const currentOwner = await realEstate.ownerOf(1)
            })

            it('Returns lawyer', async () => {
                const result = await escrow.lawyer()
                expect(result).to.be.equal(lawyer.address)

                const currentOwner = await realEstate.ownerOf(1)
            })  
        })
    })

    describe('Listing', () => {
        describe('Success', () => {

            it('Updates as listed', async () => {
                const result = await escrow.isListed(1)
                expect(result).to.be.equal(true)
            })

            it('Returns buyer', async () => {
                const result = await escrow.buyer(1)
                expect(result).to.be.equal(buyer.address)
            })

            it('Returns purchase price', async () => {
                const result = await escrow.purchasePrice(1)
                expect(result).to.be.equal(tokens(10))
            })

            it('Returns escrow amount', async () => {
                const result = await escrow.escrowAmount(1)
                expect(result).to.be.equal(tokens(5))
            })

            it('Updates ownership', async () => {
                expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address)
                const currentOwner = await realEstate.ownerOf(1)
            })
        })
          
        describe('Failure', async () => {
            let nftAddress

            it("Should fail when a non-seller tries to list an NFT", async function () {
            await expect(escrow.connect(attacker).list(1, seller.address, 1000, 200)).to.be.revertedWith("Escrow: Only seller can call this method");
            })
        })
    })
       
    describe('Deposits', () => {
        describe('Success', () => {

            beforeEach(async () => {
                const transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
                await transaction.wait()
            })

            it('Updates contract balance', async () => {
                const result = await escrow.getBalance()
                expect(result).to.be.equal(tokens(5))

                const currentOwner = await realEstate.ownerOf(1)
            })
        })
         
    
        describe('Failure', async () => {

            it("Should fail when a non-buyer tries to deposit earnest money", async function () {
                await expect(escrow.connect(attacker).depositEarnest(1, { value: 200 })).to.be.revertedWith("Escrow: Only buyer can call this method");
            })
        })
    })

    describe('Inspection', () => {
        describe('Success', () => {

            beforeEach(async () => {
                const transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
                await transaction.wait()
            })

            it('Updates inspection status', async () => {
                const result = await escrow.inspectionPassed(1)
                expect(result).to.be.equal(true)
            })
        })
    })

    describe('Approval', () => {
        describe('Success', () => {

            beforeEach(async () => {
                let transaction = await escrow.connect(buyer).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(seller).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(lender).approveSale(1)
                await transaction.wait()
            })

            it('Updates approval status', async () => {
                expect(await escrow.approval(1, buyer.address)).to.be.equal(true)
                expect(await escrow.approval(1, seller.address)).to.be.equal(true)
                expect(await escrow.approval(1, lender.address)).to.be.equal(true)

                const currentOwner = await realEstate.ownerOf(1)
            })
        })

        describe('Failure', async () => {

           it("Should fail when a non-inspector tries to update inspection status", async function () {               
                await expect(escrow.connect(attacker).updateInspectionStatus(1, true)).to.be.revertedWith("Escrow: Only inspector can call this method");
            })
        })
    })


    describe('Legal', () => {
        describe('Success', () => {

            beforeEach(async () => {
                const transaction = await escrow.connect(lawyer).updateLegalStatus(1, true)
                await transaction.wait()
            })

            it('Updates legal status', async () => {
                const result = await escrow.legalPassed(1)
                expect(result).to.be.equal(true)
            })
        })
    })

    describe('Approval', () => {
        describe('Success', () => {

            beforeEach(async () => {
                let transaction = await escrow.connect(buyer).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(seller).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(lender).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(lawyer).approveSale(1)
                await transaction.wait()
            })

            it('Updates approval status', async () => {
                expect(await escrow.approval(1, buyer.address)).to.be.equal(true)
                expect(await escrow.approval(1, seller.address)).to.be.equal(true)
                expect(await escrow.approval(1, lender.address)).to.be.equal(true)
                expect(await escrow.approval(1, lawyer.address)).to.be.equal(true)

                const currentOwner = await realEstate.ownerOf(1)
            })
        })

        describe('Failure', async () => {
           it("Should fail when a non-lawyer tries to update legal status", async function () {
                
                await expect(escrow.connect(attacker).updateLegalStatus(1, true)).to.be.revertedWith("Escrow: Only lawyer can call this method");
            })
        })
    })

    describe('Sale', () => {
        describe('Success', () => {

            beforeEach(async () => {
                let transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
                await transaction.wait()

                transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
                await transaction.wait()

                transaction = await escrow.connect(lawyer).updateLegalStatus(1, true)
                await transaction.wait()

                transaction = await escrow.connect(buyer).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(seller).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(lender).approveSale(1)
                await transaction.wait()

                await lender.sendTransaction({ to: escrow.address, value: tokens(5) })

                transaction = await escrow.connect(seller).finalizeSale(1)
                await transaction.wait()
            })

            it('Updates ownership', async () => {
                expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
            })

            it('Updates balance', async () => {
                expect(await escrow.getBalance()).to.be.equal(0)
            })
        })

        describe('Failure', async () => {
            beforeEach(async () => {

            let transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()

            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
            await transaction.wait()

            transaction = await escrow.connect(lawyer).updateLegalStatus(1, false)
            await transaction.wait()            

            })

            it('Fails to update ownership due to unmet condition', async () => {

            await expect(escrow.connect(seller).finalizeSale(1)).to.be.reverted

            const currentOwner = await realEstate.ownerOf(1)

            expect(await realEstate.ownerOf(1)).to.not.equal(buyer.address)
            })

            it('Fails to transfer escrow to seller due to sale not finaized', async () => {
                
            const result = await escrow.getBalance();
            expect(result).to.not.equal(0)
            })             
        })
    })

    describe('Finalize Sale', () => {
        describe('Success', () => {
            let nftID, purchasePrice

            beforeEach(async () => {
                purchasePrice = tokens(10)
                nftID = 1

                await lender.sendTransaction({ to: escrow.address, value: purchasePrice })

                let transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
                await transaction.wait()

                transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
                await transaction.wait()

                transaction = await escrow.connect(lawyer).updateLegalStatus(1, true)
                await transaction.wait()

                transaction = await escrow.connect(buyer).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(seller).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(lender).approveSale(1)
                await transaction.wait()                

            })

            it('Should finalize sale and emit event', async () => {
                await expect(escrow.finalizeSale(nftID)).to.emit(escrow, "SaleFinalized") 
                .withArgs(nftID, buyer.address, seller.address, purchasePrice);
            })
        })
    })

    describe('Cancellation', async () => {
        describe('Success', () => {
            let nftID

            beforeEach(async () => {
                nftID = 1 

                let transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
                await transaction.wait()
            })

            it('Returns balance to buyer if inspection not passed', async () => {
                // Update Inspection Status to fail
                await escrow.connect(inspector).updateInspectionStatus(nftID, false)

                // Record initial buyer balance
                const initialBuyerBalance = await ethers.provider.getBalance(buyer.address)

                // Perform Cancellation
                await escrow.connect(buyer).cancelSale(nftID)

                // Check final buyer balance
                const finalBuyerBalance = await ethers.provider.getBalance(buyer.address)
                expect(finalBuyerBalance).to.be.greaterThan(initialBuyerBalance)
            })

            it('Sends balance to seller if inspection passed', async () => {
                // Update Inspection Status to pass
                await escrow.connect(inspector).updateInspectionStatus(nftID, true)

                // Record initial seller balance
                const initialSellerBalance = await ethers.provider.getBalance(seller.address)

                // Perform Cancellation
                await escrow.connect(seller).cancelSale(nftID)

                // Check final seller balance
                const finalSellerBalance = await ethers.provider.getBalance(seller.address);
                expect(finalSellerBalance).to.be.greaterThan(initialSellerBalance);
            })
        })       

    describe('DoS Attack on cancelSale', () => {
        let nftID1, nftID2, purchasePrice

            beforeEach(async () => {
                nftID1 = 1
                nftID2 = 2
                purchasePrice = tokens(10)

                // Ensure the seller owns the NFTs
                await realEstate.connect(seller).mint(nftID1)
                await realEstate.connect(seller).mint(nftID2)

                // Then check ownership
                const ownerOfNFT1 = await realEstate.ownerOf(nftID1)
                const ownerOfNFT2 = await realEstate.ownerOf(nftID2)
                // Ensure that the seller is the owner before approving
                if (ownerOfNFT1 === seller.address) {
                    await realEstate.connect(seller).approve(escrow.address, nftID1)                        
                }

                if (ownerOfNFT2 === seller.address) {
                    await realEstate.connect(seller).approve(escrow.address, nftID2)
                }
                
                // Seller lists house 2 for buyer 2
                await escrow.connect(seller).list(nftID2, attacker.address, purchasePrice, tokens(1))

                 //Buyer 1 sends depositEarnest of 5 ETH to the contract
                await escrow.connect(buyer).depositEarnest(nftID1, { value: tokens(5) })
                await escrow.connect(buyer).depositEarnest(nftID2, { value: tokens(5) })


            })

            it('Incorrectly sends 1 ETH to buyer 2 on cancelSale without deposit', async () => {
                const initialAttackerBalance = await ethers.provider.getBalance(attacker.address)

                // Buyer 2 decides to cancelSale
                await escrow.connect(attacker).cancelSale(nftID2)

                const finalAttackerBalance = await ethers.provider.getBalance(attacker.address)

                // Check if attacker (buyer 2) received 1 ETH without depositing
                expect(finalAttackerBalance).to.be.greaterThan(initialAttackerBalance)
            })

            it("Seller can't finalizeSale due to insufficient contract balance", async () => {
                // Buyer 2 cancels sale, erroneously draining the contract
                await escrow.connect(attacker).cancelSale(nftID2);

                transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
                await transaction.wait()

                transaction = await escrow.connect(lawyer).updateLegalStatus(1, true)
                await transaction.wait()

                transaction = await escrow.connect(buyer).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(seller).approveSale(1)
                await transaction.wait()

                transaction = await escrow.connect(lender).approveSale(1)
                await transaction.wait()

                // Attempt to finalize sale
                await expect(escrow.connect(seller).finalizeSale(nftID1)).to.be.revertedWith("Escrow: Contract does not have enough balance")
            })
        })
    })
})