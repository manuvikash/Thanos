import { useState, useEffect, useCallback } from 'react'
import { runScan, Customer, Finding } from '../api'

export type ScanStatus = 'ready' | 'scanning' | 'complete' | 'error'

interface UseScanLogicProps {
    onScanComplete: (
        findings: Finding[],
        stats: { resources: number; findings: number },
        tenantId: string,
        snapshotKey: string
    ) => void
    onScanError: (error: string) => void
    onLoadingChange: (loading: boolean) => void
    currentTenantId?: string
}

export function useScanLogic({
    onScanComplete,
    onScanError,
    onLoadingChange,
    currentTenantId,
}: UseScanLogicProps) {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [tenantId, setTenantId] = useState('')
    const [status, setStatus] = useState<ScanStatus>('ready')
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [loadingCustomers, setLoadingCustomers] = useState(true)

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

    // Sync with currentTenantId prop
    useEffect(() => {
        if (currentTenantId && currentTenantId !== tenantId) {
            setTenantId(currentTenantId)
            const customer = customers.find((c) => c.tenant_id === currentTenantId)
            setSelectedCustomer(customer || null)
        }
    }, [currentTenantId, customers, tenantId])

    // Update tenantId when customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            setTenantId(selectedCustomer.tenant_id)
        }
    }, [selectedCustomer])

    const handleCustomerChange = useCallback(
        (selectedTenantId: string) => {
            if (selectedTenantId === '') {
                setSelectedCustomer(null)
                setTenantId('')
            } else {
                const customer = customers.find((c) => c.tenant_id === selectedTenantId)
                if (customer) {
                    setSelectedCustomer(customer)
                    setTenantId(customer.tenant_id)
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

            const customer = selectedCustomer || customers.find((c) => c.tenant_id === tenantId)

            if (!customer) {
                throw new Error('Please select a valid customer')
            }

            const response = await runScan({
                tenant_id: customer.tenant_id,
                role_arn: customer.role_arn,
                account_id: customer.account_id,
                regions: customer.regions,
                rules_source: 'repo',
            })

            clearInterval(progressInterval)
            setProgress(100)
            setStatus('complete')
            onScanComplete(
                response.findings_sample,
                response.totals,
                customer.tenant_id,
                response.snapshot_key
            )

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
        selectedCustomer,
        customers,
        tenantId,
        onLoadingChange,
        onScanComplete,
        onScanError,
    ])

    const resetSelection = useCallback(() => {
        setSelectedCustomer(null)
        setTenantId('')
        setStatus('ready')
        setProgress(0)
        setError(null)
    }, [])

    return {
        customers,
        selectedCustomer,
        tenantId,
        status,
        progress,
        error,
        loadingCustomers,
        handleCustomerChange,
        executeScan,
        resetSelection,
    }
}
