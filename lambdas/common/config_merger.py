"""
Configuration merging and conflict detection logic.
"""
from typing import Dict, Any, List, Tuple, Optional
from .config_models import ResourceGroup, BaseConfig, Conflict
from .models import Resource
import copy


def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep merge two dictionaries, with override taking precedence.
    
    Args:
        base: Base configuration
        override: Override configuration
        
    Returns:
        Merged configuration
    """
    result = copy.deepcopy(base)
    
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    
    return result


def get_all_paths(config: Dict[str, Any], prefix: str = "") -> List[str]:
    """
    Get all configuration paths in a nested dictionary.
    
    Args:
        config: Configuration dictionary
        prefix: Path prefix
        
    Returns:
        List of dot-notation paths
    """
    paths = []
    
    for key, value in config.items():
        current_path = f"{prefix}.{key}" if prefix else key
        
        if isinstance(value, dict):
            paths.extend(get_all_paths(value, current_path))
        else:
            paths.append(current_path)
    
    return paths


def get_value_at_path(config: Dict[str, Any], path: str) -> Any:
    """
    Get value at a specific path in the configuration.
    
    Args:
        config: Configuration dictionary
        path: Dot-notation path
        
    Returns:
        Value at path or None if not found
    """
    parts = path.split('.')
    current = config
    
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    
    return current


def set_value_at_path(config: Dict[str, Any], path: str, value: Any) -> None:
    """
    Set value at a specific path in the configuration.
    
    Args:
        config: Configuration dictionary
        path: Dot-notation path
        value: Value to set
    """
    parts = path.split('.')
    current = config
    
    for i, part in enumerate(parts[:-1]):
        if part not in current:
            current[part] = {}
        current = current[part]
    
    current[parts[-1]] = value


def detect_conflicts(configs: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Detect configuration conflicts and merge configs based on priority.
    
    Args:
        configs: List of config dicts with 'source', 'priority', and 'config' keys
        
    Returns:
        Tuple of (merged_config, list of conflicts)
    """
    conflicts = []
    merged_config = {}
    
    # Get all unique paths across all configs
    all_paths = set()
    for config_item in configs:
        all_paths.update(get_all_paths(config_item['config']))
    
    # Detect conflicts for each path
    for path in all_paths:
        values_by_source = []
        
        for config_item in configs:
            value = get_value_at_path(config_item['config'], path)
            if value is not None:
                values_by_source.append({
                    'priority': config_item['priority'],
                    'value': value,
                    'source': config_item['source']
                })
        
        # If we have multiple different values, it's a conflict
        unique_values = set(str(v['value']) for v in values_by_source)
        
        if len(unique_values) > 1:
            # Record conflict
            conflicts.append({
                'path': path,
                'sources': [v['source'] for v in values_by_source],
                'values': [v['value'] for v in values_by_source],
                'resolution': 'use_highest_priority'
            })
            
            # Apply default resolution (highest priority)
            highest = max(values_by_source, key=lambda x: x['priority'])
            set_value_at_path(merged_config, path, highest['value'])
        elif values_by_source:
            # No conflict, use the single value
            set_value_at_path(merged_config, path, values_by_source[0]['value'])
    
    return merged_config, conflicts


def get_effective_config(configs: List[Dict[str, Any]], resolutions: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get the effective configuration after merging all sources and applying resolutions.
    
    Args:
        configs: List of config dicts with 'source', 'priority', and 'config' keys
        resolutions: Manual conflict resolutions (path -> value)
        
    Returns:
        Effective merged configuration
    """
    merged_config, _ = detect_conflicts(configs)
    
    # Apply manual resolutions
    for path, value in resolutions.items():
        set_value_at_path(merged_config, path, value)
    
    return merged_config


def detect_conflicts_legacy(
    resource: Resource,
    base_config: Optional[BaseConfig],
    groups: List[ResourceGroup],
    resolutions: Dict[str, Any] = None
) -> Tuple[Dict[str, Any], List[Conflict]]:
    """
    Legacy detect conflicts function (kept for backward compatibility).
    
    Args:
        resource: The resource to evaluate
        base_config: Base configuration for resource type
        groups: Matching resource groups sorted by priority
        resolutions: Existing conflict resolutions
        
    Returns:
        Tuple of (merged_config, list of conflicts)
    """
    resolutions = resolutions or {}
    conflicts = []
    
    # Start with base config
    merged_config = base_config.config if base_config else {}
    
    # Track all configuration sources
    config_sources = []
    
    if base_config:
        config_sources.append((0, merged_config, "base"))
    
    # Add group configs by priority
    for group in sorted(groups, key=lambda g: g.priority):
        if group.config_overrides:
            config_sources.append((group.priority, group.config_overrides, f"group:{group.name}"))
    
    # Get all unique paths across all configs
    all_paths = set()
    for _, config, _ in config_sources:
        all_paths.update(get_all_paths(config))
    
    # Detect conflicts for each path
    for path in all_paths:
        values_by_source = []
        
        for priority, config, source in config_sources:
            value = get_value_at_path(config, path)
            if value is not None:
                values_by_source.append((priority, value, source))
        
        # If we have multiple different values, it's a conflict
        unique_values = set(str(v) for _, v, _ in values_by_source)
        
        if len(unique_values) > 1:
            # Check if there's a manual resolution
            if path in resolutions:
                resolution = resolutions[path]
                if resolution.get('strategy') == 'manual':
                    set_value_at_path(merged_config, path, resolution.get('value'))
                else:
                    # Use highest priority
                    highest = max(values_by_source, key=lambda x: x[0])
                    set_value_at_path(merged_config, path, highest[1])
            else:
                # Record conflict
                conflict = Conflict(
                    path=path,
                    values=values_by_source,
                    resource_arn=resource.arn,
                    resolution_strategy="use_highest_priority"
                )
                conflicts.append(conflict)
                
                # Apply default resolution (highest priority)
                highest = max(values_by_source, key=lambda x: x[0])
                set_value_at_path(merged_config, path, highest[1])
        elif values_by_source:
            # No conflict, use the single value
            set_value_at_path(merged_config, path, values_by_source[0][1])
    
    return merged_config, conflicts


def get_effective_config_legacy(
    resource: Resource,
    base_config: Optional[BaseConfig],
    groups: List[ResourceGroup],
    resolutions: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Legacy get effective config function (kept for backward compatibility).
    
    Args:
        resource: The resource to evaluate
        base_config: Base configuration for resource type
        groups: Matching resource groups
        resolutions: Existing conflict resolutions
        
    Returns:
        Effective merged configuration
    """
    merged_config, _ = detect_conflicts_legacy(resource, base_config, groups, resolutions)
    return merged_config


def compare_configs(actual: Dict[str, Any], expected: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Compare actual resource configuration against expected configuration.
    
    Args:
        actual: Actual resource configuration
        expected: Expected configuration
        
    Returns:
        List of differences
    """
    differences = []
    all_paths = set(get_all_paths(actual)) | set(get_all_paths(expected))
    
    for path in all_paths:
        actual_value = get_value_at_path(actual, path)
        expected_value = get_value_at_path(expected, path)
        
        if actual_value != expected_value:
            differences.append({
                'path': path,
                'actual': actual_value,
                'expected': expected_value
            })
    
    return differences
