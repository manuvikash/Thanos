export interface Template {
    name: string;
    description: string;
    config: any;
}

export const getSupportedResourceTypes = () => {
    return [
        'aws_s3_bucket',
        'aws_iam_role',
        'aws_security_group',
        'aws_instance',
        'aws_kms_key',
        'aws_rds_cluster'
    ];
};

export const getTemplatesForResourceType = (_resourceType: string): Template[] => {
    // Return empty array for now as we don't have the actual templates
    return [];
};
