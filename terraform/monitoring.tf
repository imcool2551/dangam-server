# ============================================
# SNS Topic for Alerts (ap-northeast-2)
# ============================================
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ============================================
# SNS Topic for Billing Alerts (us-east-1)
# Billing metrics only exist in us-east-1
# ============================================
resource "aws_sns_topic" "billing_alerts" {
  provider = aws.us_east_1
  name     = "${var.project_name}-${var.environment}-billing-alerts"
}

resource "aws_sns_topic_subscription" "billing_email" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ============================================
# CloudWatch Alarm: EC2 Instance Stopped
# ============================================
resource "aws_cloudwatch_metric_alarm" "ec2_stopped" {
  alarm_name          = "${var.project_name}-${var.environment}-ec2-stopped"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "EC2 instance is stopped or unhealthy"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  treat_missing_data = "breaching"
}

# ============================================
# CloudWatch Alarm: Monthly Cost Exceeds $30
# ============================================
resource "aws_cloudwatch_metric_alarm" "billing_alarm" {
  alarm_name          = "${var.project_name}-${var.environment}-billing-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600 # 6 hours
  statistic           = "Maximum"
  threshold           = var.billing_threshold
  alarm_description   = "Monthly estimated charges exceed $${var.billing_threshold}"
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]

  dimensions = {
    Currency = "USD"
  }

  provider = aws.us_east_1
}

# ============================================
# CloudWatch Dashboard
# ============================================
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "CPU Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.app.id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Network In/Out"
          region = var.aws_region
          metrics = [
            ["AWS/EC2", "NetworkIn", "InstanceId", aws_instance.app.id],
            ["AWS/EC2", "NetworkOut", "InstanceId", aws_instance.app.id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Disk Read/Write"
          region = var.aws_region
          metrics = [
            ["AWS/EC2", "DiskReadBytes", "InstanceId", aws_instance.app.id],
            ["AWS/EC2", "DiskWriteBytes", "InstanceId", aws_instance.app.id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Status Check Failed"
          region = var.aws_region
          metrics = [
            ["AWS/EC2", "StatusCheckFailed", "InstanceId", aws_instance.app.id],
            ["AWS/EC2", "StatusCheckFailed_Instance", "InstanceId", aws_instance.app.id],
            ["AWS/EC2", "StatusCheckFailed_System", "InstanceId", aws_instance.app.id]
          ]
          period = 60
          stat   = "Maximum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Application Error Count"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/${var.environment}", "ErrorCount"]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Recent Error Logs"
          region = var.aws_region
          query  = "SOURCE '/${var.project_name}/${var.environment}/app' | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 18
        width  = 24
        height = 2
        properties = {
          markdown = "## Quick Links\n- [EC2 Console](https://ap-northeast-2.console.aws.amazon.com/ec2/home?region=ap-northeast-2#Instances:instanceId=${aws_instance.app.id})\n- [CloudWatch Logs](https://ap-northeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#logsV2:log-groups)\n- [API URL](https://api.growdangams.com/health)"
        }
      }
    ]
  })
}
