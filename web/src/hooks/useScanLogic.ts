import { useState, useEffect, useCallback, useRef } from 'react'
import { runScan, Customer, Finding } from '../api'

export type ScanStatus = 'ready' | 'scanning' | 'complete' | 'error'
export type ScanMode = 'customer' | 'region'

interface UseScanLogicProps {
    onScanComplete: (
        findings: Finding[],
        stats: { resources: number; findings: number },
        tenantId: string,
        snapshotKey: string,
        scanMode?: ScanMode,
        scanTarget?: string
    ) => void
    onScanError: (error: string) => void
    onLoadingChange: (loading: boolean) => void
    currentTenantId?: string
}

const SUPPORTED_REGIONS = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-central-1',
    'ap-southeast-1',
    'ap-northeast-1',
]

export function useScanLogic({
    onScanComplete,
    onScanError,
    onLoadingChange,
    currentTenantId,
}: UseScanLogicProps) {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [tenantId, setTenantId] = useState('')
    const [scanMode, setScanMode] = useState<ScanMode>('customer')
    const [selectedRegion, setSelectedRegion] = useState('')
    const [status, setStatus] = useState<ScanStatus>('ready')
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [loadingCustomers, setLoadingCustomers] = useState(true)
    
    // Ref to track the most recent customer change to prevent race conditions
    const currentCustomerRef = useRef<string | null>(null)

    // Load customers on mount
    useEffect(() => {
        const fetchCustomers = async () => {
            setLoadingCustomers(true)
            try {
                const { getCustomers } = await import('../api')
                const data = await getCustomers()
                setCustomers(data)
            } catch (err) {
                console.error('Failed to load customers:', err)
            } finally {
                setLoadingCustomers(false)
            }
        }
        fetchCustomers()
    }, [])

    // Only sync from parent on initial mount if currentTenantId is provided
    useEffect(() => {
        if (currentTenantId && currentTenantId !== tenantId && customers.length > 0) {
            const customer = customers.find((c) => c.tenant_id === currentTenantId)
            if (customer) {
                setSelectedCustomer(customer)
                setTenantId(customer.tenant_id)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Only run once on mount

    const handleCustomerChange = useCallback(
        (selectedTenantId: string) => {
            console.log('[useScanLogic] handleCustomerChange called with:', selectedTenantId)
            
            // Update ref immediately to track the latest selection
            currentCustomerRef.current = selectedTenantId
            
            // Reset scan state first
            setStatus('ready')
            setProgress(0)
            setError(null)
            
            if (selectedTenantId === '') {
                setSelectedCustomer(null)
                setTenantId('')
            } else {
                const customer = customers.find((c) => c.tenant_id === selectedTenantId)
                if (customer) {
                    // Only update if this is still the most recent selection
                    if (currentCustomerRef.current === selectedTenantId) {
                        console.log('[useScanLogic] Setting customer:', customer.customer_name)
                        setSelectedCustomer(customer)
                        setTenantId(customer.tenant_id)
                    } else {
                        console.log('[useScanLogic] Skipping stale customer update:', customer.customer_name)
                    }
                } else {
                    console.warn('[useScanLogic] Customer not found for tenant_id:', selectedTenantId)
                }
            }
        },
        [customers]
    )

    const executeScan = useCallback(async () => {
        setError(null)
        setStatus('scanning')
        setProgress(0)
        onLoadingChange(true)

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 10, 90))
            }, 300)

            if (scanMode === 'customer') {
                // Customer-based scan (existing logic)
                const customer = selectedCustomer || customers.find((c) => c.tenant_id === tenantId)

                if (!customer) {
                    throw new Error('Please select a valid customer')
                }

                // Validate customer has regions configured
                if (!customer.regions || customer.regions.length === 0) {
                    throw new Error(`Customer ${customer.customer_name} has no regions configured. Please update the customer configuration.`)
                }

                const response = await runScan({
                    tenant_id: customer.tenant_id,
                    role_arn: customer.role_arn,
                    account_id: customer.account_id,
                    regions: customer.regions,
                    rules_source: 'repo',
                })

                // Filter findings to only include those from the customer's configured regions
                const validFindings = response.findings_sample.filter(
                    (finding) => customer.regions.includes(finding.region)
                )

                clearInterval(progressInterval)
                setProgress(100)
                setStatus('complete')
                onScanComplete(
                    validFindings,
                    response.totals,
                    customer.tenant_id,
                    response.snapshot_key,
                    'customer',
                    customer.customer_name
                )
            } else if (scanMode === 'region') {
                // Region-based scan across all customers
                if (!selectedRegion) {
                    throw new Error('Please select a region')
                }

                // Filter customers that have the selected region configured
                const customersWithRegion = customers.filter(customer => 
                    customer.regions && customer.regions.includes(selectedRegion)
                )

                if (customersWithRegion.length === 0) {
                    throw new Error(`No customers are configured for region ${selectedRegion}. Please onboard customers with this region first.`)
                }

                // Scan only customers that have this region
                let combinedFindings: Finding[] = []
                let totalResources = 0
                let totalFindings = 0
                let latestSnapshotKey = ''
                let successfulScans = 0
                let failedScans = 0

                for (const customer of customersWithRegion) {
                    try {
                        const response = await runScan({
                            tenant_id: customer.tenant_id,
                            role_arn: customer.role_arn,
                            account_id: customer.account_id,
                            regions: [selectedRegion],
                            rules_source: 'repo',
                        })

                        // Filter findings for this region
                        const regionFindings = response.findings_sample.filter(
                            (f) => f.region === selectedRegion
                        )
                        combinedFindings.push(...regionFindings)
                        totalResources += response.totals.resources
                        totalFindings += response.totals.findings
                        latestSnapshotKey = response.snapshot_key
                        successfulScans++

                        setProgress((prev) => Math.min(prev + (90 / customersWithRegion.length), 89))
                    } catch (customerErr) {
                        failedScans++
                        console.error(`Failed to scan customer ${customer.customer_name} (${customer.account_id}):`, customerErr)
                    }
                }

                if (successfulScans === 0) {
                    throw new Error(`Failed to scan all ${customersWithRegion.length} customer(s) in ${selectedRegion}. Please verify the IAM roles are properly configured.`)
                }

                clearInterval(progressInterval)
                setProgress(100)
                setStatus('complete')
                onScanComplete(
                    combinedFindings,
                    { resources: totalResources, findings: totalFindings },
                    'cross-account',
                    latestSnapshotKey,
                    'region',
                    selectedRegion
                )
            }

            // Reset to ready after 3 seconds
            setTimeout(() => {
                setStatus('ready')
                setProgress(0)
            }, 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Scan failed'
            setStatus('error')
            setError(errorMessage)
            setProgress(0)
            onScanError(errorMessage)
        } finally {
            onLoadingChange(false)
        }
    }, [
        scanMode,
        selectedCustomer,
        customers,
        tenantId,
        selectedRegion,
        onLoadingChange,
        onScanComplete,
        onScanError,
    ])

    const resetSelection = useCallback(() => {
        setSelectedCustomer(null)
        setTenantId('')
        setSelectedRegion('')
        setStatus('ready')
        setProgress(0)
        setError(null)
    }, [])

    const handleScanModeChange = useCallback((mode: ScanMode) => {
        setScanMode(mode)
        resetSelection()
    }, [resetSelection])

    const handleRegionChange = useCallback((region: string) => {
        setSelectedRegion(region)
    }, [])

    return {
        customers,
        selectedCustomer,
        tenantId,
        scanMode,
        selectedRegion,
        supportedRegions: SUPPORTED_REGIONS,
        status,
        progress,
        error,
        loadingCustomers,
        handleCustomerChange,
        handleScanModeChange,
        handleRegionChange,
        executeScan,
        resetSelection,
    }
}
