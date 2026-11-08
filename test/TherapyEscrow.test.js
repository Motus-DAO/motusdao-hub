const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@nomicfoundation/hardhat-network-helpers')

const AMOUNT = ethers.parseUnits('100', 18)
const FEE_BPS = 1000n
const WINDOW = 48 * 60 * 60
const STALE = 7 * 24 * 60 * 60

async function deploy() {
  const [owner, patient, payee, oracle, other] = await ethers.getSigners()

  const Token = await ethers.getContractFactory('MockERC20')
  const token = await Token.deploy()
  await token.waitForDeployment()

  const Escrow = await ethers.getContractFactory('TherapyEscrow')
  const escrow = await Escrow.deploy(owner.address, FEE_BPS, oracle.address)
  await escrow.waitForDeployment()

  await token.mint(patient.address, ethers.parseUnits('1000', 18))
  await token.connect(patient).approve(await escrow.getAddress(), ethers.MaxUint256)

  return { owner, patient, payee, oracle, other, token, escrow }
}

async function newSession(escrow, token, patient, payee, challengeWindow = WINDOW) {
  const id = ethers.id(`session-${Math.random()}`)
  const startsAt = (await time.latest()) + 3600

  await escrow.createSession(
    id,
    await token.getAddress(),
    patient.address,
    payee.address,
    AMOUNT,
    startsAt,
    challengeWindow
  )

  return { id, startsAt }
}

describe('TherapyEscrow', () => {
  it('releases 90/10 after the challenge window', async () => {
    const { owner, patient, payee, escrow, token } = await deploy()
    const { id, startsAt } = await newSession(escrow, token, patient, payee)

    await escrow.connect(patient).deposit(id)
    await time.increaseTo(startsAt + 1)
    await escrow.connect(payee).settle(id)
    await time.increaseTo(startsAt + 1 + WINDOW + 1)
    await escrow.release(id)

    expect(await token.balanceOf(payee.address)).to.equal(ethers.parseUnits('90', 18))
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseUnits('10', 18))
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n)
  })

  it('refunds the patient when they cancel before start', async () => {
    const { patient, payee, escrow, token } = await deploy()
    const { id } = await newSession(escrow, token, patient, payee)

    await escrow.connect(patient).deposit(id)
    await escrow.connect(patient).cancelBeforeStart(id)

    expect(await token.balanceOf(patient.address)).to.equal(ethers.parseUnits('1000', 18))
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n)
  })

  it('splits a disputed session with the oracle refund share', async () => {
    const { owner, patient, payee, oracle, escrow, token } = await deploy()
    const { id, startsAt } = await newSession(escrow, token, patient, payee)

    await escrow.connect(patient).deposit(id)
    await time.increaseTo(startsAt + 1)
    await escrow.connect(payee).settle(id)
    await escrow.connect(patient).dispute(id)
    await escrow.connect(oracle).resolve(id, 5000) // 50% refund

    expect(await token.balanceOf(patient.address)).to.equal(ethers.parseUnits('950', 18))
    expect(await token.balanceOf(payee.address)).to.equal(ethers.parseUnits('45', 18))
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseUnits('5', 18))
  })

  it('does not settle before the session starts or from a non-payee', async () => {
    const { patient, payee, oracle, escrow, token } = await deploy()
    const { id, startsAt } = await newSession(escrow, token, patient, payee)

    await escrow.connect(patient).deposit(id)

    await expect(escrow.connect(payee).settle(id)).to.be.revertedWithCustomError(
      escrow,
      'NotStarted'
    )

    await time.increaseTo(startsAt + 1)

    await expect(escrow.connect(oracle).settle(id)).to.be.revertedWithCustomError(
      escrow,
      'NotPayee'
    )
  })

  it('does not release before the challenge window closes', async () => {
    const { patient, payee, escrow, token } = await deploy()
    const { id, startsAt } = await newSession(escrow, token, patient, payee)

    await escrow.connect(patient).deposit(id)
    await time.increaseTo(startsAt + 1)
    await escrow.connect(payee).settle(id)

    await expect(escrow.release(id)).to.be.revertedWithCustomError(escrow, 'TooEarly')
  })

  it('lets the patient recover a session the payee never settled', async () => {
    const { patient, payee, escrow, token } = await deploy()
    const { id, startsAt } = await newSession(escrow, token, patient, payee)

    await escrow.connect(patient).deposit(id)

    await expect(escrow.connect(patient).refundStale(id)).to.be.revertedWithCustomError(
      escrow,
      'TooEarly'
    )

    await time.increaseTo(startsAt + STALE + 1)
    await escrow.connect(patient).refundStale(id)

    expect(await token.balanceOf(patient.address)).to.equal(ethers.parseUnits('1000', 18))
  })

  it('rejects a fee above the hard cap', async () => {
    const [owner, , , oracle] = await ethers.getSigners()
    const Escrow = await ethers.getContractFactory('TherapyEscrow')

    await expect(Escrow.deploy(owner.address, 2001, oracle.address)).to.be.revertedWithCustomError(
      Escrow,
      'InvalidConfig'
    )
  })

  it('rejects a second deposit and a non-patient deposit', async () => {
    const { patient, payee, other, escrow, token } = await deploy()
    const { id } = await newSession(escrow, token, patient, payee)

    await expect(escrow.connect(other).deposit(id)).to.be.revertedWithCustomError(
      escrow,
      'NotPatient'
    )

    await escrow.connect(patient).deposit(id)

    await expect(escrow.connect(patient).deposit(id)).to.be.revertedWithCustomError(
      escrow,
      'InvalidStatus'
    )
  })
})
