const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller, inspector, lender
    let realEstate, escrow

    beforeEach(async () => {
        // Setup accounts
        [buyer, seller, inspector, lender] = await ethers.getSigners()

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
        )

        // Approve Property
        transaction = await realEstate.connect(seller).approve(escrow.address, 1)
        await transaction.wait()

        // List Property
        transaction = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(5))
        await transaction.wait()

        const currentOwner = await realEstate.ownerOf(1)
        console.log("Current owner: ", currentOwner)  
    })

    describe('Deployment', () => {
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
            console.log("Current owner: ", currentOwner)
        })  

        describe('Failure', async () => {
            //fail code
        })
    })

    describe('Listing', () => {
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
        console.log("Current owner: ", currentOwner)
        })

          

        describe('Failure', async () => {
            //fail code
        })
    })
       
    describe('Deposits', () => {
        beforeEach(async () => {
            const transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()
        })

        it('Updates contract balance', async () => {
            const result = await escrow.getBalance()
            expect(result).to.be.equal(tokens(5))

            const currentOwner = await realEstate.ownerOf(1)
         console.log("Current owner: ", currentOwner) 
        })

         
    
        describe('Failure', async () => {

            it('Fails to send correct earnest amount', async () => {
                const cost = ethers.utils.parseEther("0.5")
                incorrectEthAmount = cost.mul(40).div(100)

                await expect(escrow.connect(buyer).depositEarnest(1, { value: incorrectEthAmount })).to.be.reverted
            })
        })
    })
    describe('Inspection', () => {
        beforeEach(async () => {
            const transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
            await transaction.wait()
        })

        it('Updates inspection status', async () => {
            const result = await escrow.inspectionPassed(1)
            expect(result).to.be.equal(true)

            const currentOwner = await realEstate.ownerOf(1)
        console.log("Current owner: ", currentOwner) 
        })

         

        describe('Failure', async () => {
            //fail code
        })
    })

    describe('Approval', () => {
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
            console.log("Current owner: ", currentOwner)            
        })

        describe('Failure', async () => {
            //fail code
        })
    })

    describe('Sale', () => {
        beforeEach(async () => {
            let transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()

            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
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

        describe('Failure', async () => {
            beforeEach(async () => {

            let transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()
            console.log("Buyer address: ", buyer.address)

            transaction = await escrow.connect(inspector).updateInspectionStatus(1, false)
            await transaction.wait()           

            })

            it('Fails to update ownership due to unmet condition', async () => {

            await expect(escrow.connect(seller).finalizeSale(1)).to.be.reverted
            console.log("Seller address: ", seller.address)

            const currentOwner = await realEstate.ownerOf(1)
            console.log("Current owner: ", currentOwner)

            expect(await realEstate.ownerOf(1)).to.not.equal(buyer.address)
            })

            it('Fails to transfer escrow to seller due to sale not finaized', async () => {
                
            const result = await escrow.getBalance();
            expect(result).to.not.equal(0)
            })             
        })
    })
})
